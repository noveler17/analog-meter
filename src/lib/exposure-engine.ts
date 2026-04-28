// AnalogMeter — Pure exposure / EV / zone / combo math.
// 모든 입력값은 토큰(`src/tokens.ts`) 기준의 1/3 스탑 시리즈를 가정한다.
// 이 파일은 사이드 이펙트 없는 순수 함수만 포함한다 (Worker · main 양쪽 import 가능).

import {
  F_STOP_VALUES,
  ISO_VALUES,
  EC_VALUES,
  SHUTTER_VALUES,
} from '../tokens'
import type {
  ComboPair,
  ComboPairHighlighted,
  EC,
  EV,
  FRange,
  FStop,
  ISO,
  SSRange,
  ShutterSpeed,
  ZoneIndex,
} from '../types'

// ---------------------------------------------------------------------------
// 1. EV 공식 — 루미넌스 → EV
// ---------------------------------------------------------------------------

/**
 * 반사식 노출계 보정 상수 (ISO 2720 표준).
 * EV100 = log2(L * S / K), S = 100 (ISO).
 */
const K_REFLECTED = 12.5

/**
 * 카메라 센서 출력은 자동 화이트밸런스/감마 등으로 인해 절대 휘도가 아니다.
 * 정규화된 0~1 픽셀값을 실제 cd/m² 기반 EV에 매핑하기 위한 스케일.
 *
 * 검증 노트(_workspace/02_engine/notes.md 참조):
 *   18% 그레이(L=0.18) · ISO 100 · EC 0 일 때 EV ≈ 9.4 (전형적 실내 조명) 가 되도록
 *   CALIBRATION = 100 으로 설정. 기기별 추후 튜닝 가능.
 *
 *   EV100 = log2(0.18 * 100 * 100 / 12.5) = log2(144) ≈ 7.17  (CALIBRATION=100)
 *   --> Sunny f/16 (EV15) 시나리오에서는 sensor 가 클리핑되므로 spot/auto-expose 보정 별도 필요.
 *
 *   비고: 이 값은 단일 진실 소스이므로 절대 중복 정의하지 않는다.
 */
const CALIBRATION = 100

/** 0-1 정규화 luminance → EV100 (ISO 100, EC 0 기준). */
export function luminanceToEV100(luminance: number): EV {
  // 매우 어두운 영역에서 -Infinity 방지 — 임계 미만은 EV0 으로 클램프.
  if (luminance <= 1e-6) return 0
  return Math.log2((luminance * CALIBRATION * 100) / K_REFLECTED)
}

/**
 * ISO + EC 보정이 반영된 최종 EV.
 *   ISO 200 → +1 EV (한 스탑 더 밝음 표시),
 *   EC -1   → -1 EV (한 스탑 어두운 노출 의도).
 */
export function luminanceToEV(luminance: number, iso: ISO, ec: EC): EV {
  const ev100 = luminanceToEV100(luminance)
  const isoAdj = Math.log2(iso / 100)
  return ev100 + isoAdj + ec
}

// ---------------------------------------------------------------------------
// 2. Zone 분류기
// ---------------------------------------------------------------------------

/**
 * 픽셀 luminance 단독 → Zone Index (0~10).
 * Zone V(=5) 는 18% mid-gray 기준.
 *
 *   Zone V  ≈ L 0.18
 *   Zone VI ≈ L 0.36 (1 EV 위)
 *   Zone IV ≈ L 0.09 (1 EV 아래)
 *
 * 1 EV = 한 Zone 차이.
 */
export function classifyZone(luminance: number): ZoneIndex {
  if (luminance <= 1e-6) return 0
  // Zone V 기준 EV 차이를 직접 계산.
  const stopsFromMid = Math.log2(luminance / 0.18)
  const zone = Math.round(5 + stopsFromMid)
  return clampZone(zone)
}

/** 두 EV(spot vs metered)로 Zone 분류 — Spot Meter 용. */
export function classifyZoneByEV(spotEV: EV, meteredEV: EV): ZoneIndex {
  const diff = Math.round(spotEV - meteredEV)
  return clampZone(5 + diff)
}

function clampZone(z: number): ZoneIndex {
  if (z < 0) return 0
  if (z > 10) return 10
  return z as ZoneIndex
}

// ---------------------------------------------------------------------------
// 3. 1/3 스탑 스냅 헬퍼
// ---------------------------------------------------------------------------

/** 임의 값을 시리즈 중 가장 가까운 값으로 스냅. */
export function snapToStop<T extends number>(
  value: number,
  stops: readonly T[],
): T {
  let best = stops[0]
  let bestDist = Math.abs(value - best)
  for (let i = 1; i < stops.length; i++) {
    const d = Math.abs(value - stops[i])
    if (d < bestDist) {
      best = stops[i]
      bestDist = d
    }
  }
  return best
}

export const snapISO = (v: number): ISO => snapToStop(v, ISO_VALUES)
export const snapEC = (v: number): EC => snapToStop(v, EC_VALUES)
export const snapFStop = (v: number): FStop => snapToStop(v, F_STOP_VALUES)
export const snapShutter = (v: number): ShutterSpeed =>
  snapToStop(v, SHUTTER_VALUES)

// ---------------------------------------------------------------------------
// 4. 포맷터
// ---------------------------------------------------------------------------

export function formatAperture(f: FStop): string {
  // 정수 (8, 11, 16) 는 소수점 없이, 그 외는 1자리.
  if (Number.isInteger(f)) return `f/${f.toFixed(0)}`
  return `f/${f.toFixed(1)}`
}

export function formatShutter(t: ShutterSpeed): string {
  if (t >= 1) {
    // 1초 이상 → '2"', '0.6"' 표기
    if (Number.isInteger(t)) return `${t.toFixed(0)}"`
    return `${t.toFixed(1)}"`
  }
  // 분수 표기. 토큰의 1/N 로부터 round 한다.
  const denom = Math.round(1 / t)
  return `1/${denom}`
}

// ---------------------------------------------------------------------------
// 5. EV ↔ ComboPair 생성
// ---------------------------------------------------------------------------

/**
 * 주어진 EV에 부합하는 모든 (조리개, 셔터) 쌍을 생성한다.
 *   EV = log2(N² / t)  ⇒  t = N² / 2^EV
 *
 *   각 F_STOP_VALUES 에 대해 이론적 셔터를 계산 후, SHUTTER_VALUES (1/3 스탑)
 *   에 가장 가까운 값으로 스냅. 셔터 한계(30s ~ 1/8000s)를 벗어나면 제외.
 *
 *   결과 정렬: aperture ascending (작은 f/no 부터).
 */
export function generateCombos(ev: EV): ComboPair[] {
  const pairs: ComboPair[] = []
  const denom = Math.pow(2, ev)
  const SS_MAX = SHUTTER_VALUES[0] // 30s
  const SS_MIN = SHUTTER_VALUES[SHUTTER_VALUES.length - 1] // 1/8000s

  for (const aperture of F_STOP_VALUES) {
    const tIdeal = (aperture * aperture) / denom
    if (tIdeal > SS_MAX || tIdeal < SS_MIN) continue
    const shutterSpeed = snapShutter(tIdeal)
    pairs.push({
      aperture,
      apertureLabel: formatAperture(aperture),
      shutterSpeed,
      shutterLabel: formatShutter(shutterSpeed),
    })
  }
  return pairs
}

// ---------------------------------------------------------------------------
// 6. 우선순위 하이라이트
// ---------------------------------------------------------------------------

function inRange(value: number, range: [number, number] | null): boolean {
  if (!range) return false
  const [lo, hi] = range[0] <= range[1] ? range : [range[1], range[0]]
  // 부동소수 오차 흡수.
  return value >= lo - 1e-6 && value <= hi + 1e-6
}

/**
 * 사용자가 지정한 F/SS 우선순위 범위를 각 ComboPair에 적용.
 *   PRD 2.2 — F만 OR SS만 만족 → 글씨 초록 / 둘 다 만족 → 테두리 초록.
 *   하이라이트 판단은 Worker가 전부 끝낸 뒤 메인에 보낸다 (UI는 렌더만).
 */
export function applyHighlight(
  pairs: ComboPair[],
  fRange: FRange | null,
  ssRange: SSRange | null,
): ComboPairHighlighted[] {
  return pairs.map((p) => ({
    ...p,
    matchF: inRange(p.aperture, fRange),
    matchSS: inRange(p.shutterSpeed, ssRange),
  }))
}

// ---------------------------------------------------------------------------
// 7. Average luminance — Worker가 직접 호출
// ---------------------------------------------------------------------------

/**
 * RGBA 픽셀 버퍼에서 평균 sRGB 휘도를 계산.
 *   - 4×4 픽셀 간격 서브샘플링으로 성능 확보 (60fps 보장).
 *   - sRGB Rec.709 luma coefficients (0.2126/0.7152/0.0722).
 *   - 결과는 0-1 정규화.
 */
export function averageLuminance(
  data: Uint8ClampedArray,
  options: { stride?: number } = {},
): number {
  const stride = options.stride ?? 4 * 4 // 4 channels × 4 pixel skip
  let sum = 0
  let count = 0
  for (let i = 0; i < data.length; i += stride) {
    const r = data[i] / 255
    const g = data[i + 1] / 255
    const b = data[i + 2] / 255
    sum += 0.2126 * r + 0.7152 * g + 0.0722 * b
    count++
  }
  return count > 0 ? sum / count : 0
}

/**
 * 지정한 정규화 좌표(0-1) 주변 작은 박스의 평균 휘도 — Spot Meter용.
 *   boxRatio(예: 0.05) → 캔버스 짧은 변의 5% 가 한 변.
 */
export function spotLuminance(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  nx: number,
  ny: number,
  boxRatio = 0.05,
): number {
  const cx = Math.round(nx * width)
  const cy = Math.round(ny * height)
  const half = Math.max(2, Math.round(Math.min(width, height) * boxRatio * 0.5))
  const x0 = Math.max(0, cx - half)
  const x1 = Math.min(width - 1, cx + half)
  const y0 = Math.max(0, cy - half)
  const y1 = Math.min(height - 1, cy + half)

  let sum = 0
  let count = 0
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * width + x) * 4
      const r = data[i] / 255
      const g = data[i + 1] / 255
      const b = data[i + 2] / 255
      sum += 0.2126 * r + 0.7152 * g + 0.0722 * b
      count++
    }
  }
  return count > 0 ? sum / count : 0
}
