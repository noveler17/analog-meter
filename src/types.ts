// AnalogMeter — Shared Type Contracts
// 이 파일은 engine-engineer (Web Worker)와 ui-engineer (React) 양쪽이
// 바인딩 참조로 사용한다. 변경 시 반드시 _workspace/01_architect/contracts.md
// 도 함께 갱신할 것.

// ---------------------------------------------------------------------------
// 1. Scalar aliases — 의미 있는 이름으로 number를 재포장하여 가독성 확보
// ---------------------------------------------------------------------------

/** ISO 감도 값. 25 ~ 12800+. 1/3 스탑 단위 스냅. */
export type ISO = number

/** 노출 보정값 (EV 단위). -3.0 ~ +3.0. 1/3 스탑 단위 스냅. */
export type EC = number

/** 조리개 f-number. 1.2 ~ 22. 1/3 스탑 시리즈에서 선택. */
export type FStop = number

/** 셔터 스피드(초 단위). 30s ~ 1/8000s = 30 ~ 0.000125. */
export type ShutterSpeed = number

/** EV(Exposure Value). ISO/EC 보정이 반영된 절대 노출 값. */
export type EV = number

/** 35mm 환산 줌 배율. 1.0 ~ 5.0. */
export type FocalZoom = number

// ---------------------------------------------------------------------------
// 2. Zone System
// ---------------------------------------------------------------------------

/** Ansel Adams Zone System: 0(순흑) ~ X(순백). */
export type ZoneIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

/** ZoneIndex 별칭 — engine-engineer/ui-engineer 양쪽에서 의미적으로 사용. */
export type Zone = ZoneIndex

/** 로마자 표기 매핑 (UI 라벨링용). */
export const ZONE_ROMAN: Record<ZoneIndex, string> = {
  0: '0',
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
  9: 'IX',
  10: 'X',
}

export interface ZoneReading {
  zone: ZoneIndex
  ev: EV
  /** 0-1 정규화된 평균 루미넌스. */
  luminance: number
}

// ---------------------------------------------------------------------------
// 3. Web Worker Messages — main ↔ worker 양방향 페이로드
// ---------------------------------------------------------------------------

/** 메인 → Worker 요청 메시지. */
export interface WorkerRequest {
  type:
    | 'start'
    | 'stop'
    | 'frame'
    | 'set-iso'
    | 'set-ec'
    | 'set-focal'
    | 'set-priority'
    | 'sample-spot'
  iso?: ISO
  ec?: EC
  focalZoom?: FocalZoom
  priorityF?: FRange | null
  prioritySS?: SSRange | null
  /** sample-spot 타입에서 사용. 0-1 정규화 좌표. */
  spotX?: number
  spotY?: number
  /** 'frame' / 'sample-spot' 타입에서 카메라 비디오 프레임을 OffscreenCanvas로 전달. */
  frame?: ImageBitmap
}

/** Worker → 메인 응답 메시지. */
export interface WorkerResult {
  type: 'ev-update' | 'spot-result' | 'error' | 'ready'
  /** 현재 EV (ISO/EC 보정 포함). type === 'ev-update'에서만 유효. */
  ev?: EV
  /** ISO 100, EC 0 기준 원시 EV. */
  evRaw?: EV
  /** 메인 피사체 Zone 분류. */
  zone?: ZoneIndex
  /** 0-1 정규화된 평균 luminance. */
  luminance?: number
  /** performance.now() 기반 타임스탬프 — 60fps 동기화에 사용. */
  timestamp: number
  /** 'spot-result'에서만 채워짐. */
  spot?: SpotResult
  /** 'error'에서만 채워짐. */
  error?: string
  /**
   * 'ev-update'에서만 채워짐. 우선순위 하이라이트가 적용된 모든 조합 쌍.
   * UI는 추가 계산 없이 그대로 렌더링한다.
   */
  pairs?: ComboPairHighlighted[]
  /** 현재 적용된 ISO (Worker 내부 상태 그대로). */
  iso?: ISO
  /** 현재 적용된 EC. */
  ec?: EC
  /** 현재 적용된 우선순위 F 범위. */
  priorityF?: FRange | null
  /** 현재 적용된 우선순위 SS 범위. */
  prioritySS?: SSRange | null
  /** 측정 시각 (Date.now()). */
  measuredAt?: number
}

/** 가독성을 위한 alias — WorkerRequest/WorkerResult와 동일. */
export type WorkerMessageIn = WorkerRequest
export type WorkerMessageOut = WorkerResult

/** 사용자가 화면을 탭하여 측정한 스폿 결과. */
export interface SpotResult {
  zone: ZoneIndex
  ev: EV
  /** 0-1 정규화된 탭 위치. */
  x: number
  y: number
}

// ---------------------------------------------------------------------------
// 4. Device Database
// ---------------------------------------------------------------------------

export interface CameraLens {
  /** 35mm 환산 초점 거리(mm). */
  focalLength35mm: number
  /** 고정 최대 조리개 (f-number). */
  maxAperture: FStop
  /** 줌 배율 — 1.0(메인), 0.5(울트라와이드), 2.0/3.0/5.0(텔레). */
  zoomFactor: FocalZoom
  /** UI 라벨용 이름. ex) 'Main', 'Telephoto 5x'. */
  label: string
}

export interface Device {
  /** 'iphone-16-pro', 'galaxy-s26-ultra' 등 슬러그. */
  id: string
  brand: 'apple' | 'samsung'
  model: string
  /** 사용 가능한 모든 렌즈. */
  lenses: CameraLens[]
  /** 센서 사이즈 (이미지 서클 직경, mm). 노출 계산엔 직접 사용하지 않으나 메타로 보관. */
  sensorSizeMm?: number
}

// ---------------------------------------------------------------------------
// 5. Exposure Combinations
// ---------------------------------------------------------------------------

export interface ComboPair {
  /** f-number. ex) 1.4, 2.8, 5.6. */
  aperture: FStop
  /** 셔터 스피드 (초). ex) 0.5, 0.001 = 1/1000s. */
  shutterSpeed: ShutterSpeed
  /** 표시용 셔터 라벨. ex) '1/1000', '2"'. */
  shutterLabel: string
  /** 표시용 조리개 라벨. ex) 'f/2.8'. */
  apertureLabel: string
}

/** 사용자가 지정하는 우선순위 F 범위. [minF, maxF]. */
export type FRange = [FStop, FStop]

/** 사용자가 지정하는 우선순위 SS 범위 (초 단위). [minSS, maxSS]. */
export type SSRange = [ShutterSpeed, ShutterSpeed]

export interface ComboPairHighlighted extends ComboPair {
  /** F 우선순위 범위 만족 여부. */
  matchF: boolean
  /** SS 우선순위 범위 만족 여부. */
  matchSS: boolean
}

/** Worker가 계산하여 메인 스레드로 보내는 노출 결과 종합. */
export interface EVResult {
  /** ISO/EC 보정 포함 최종 EV. */
  ev: EV
  /** ISO 100, EC 0 기준 원시 EV. */
  evRaw: EV
  iso: ISO
  ec: EC
  /** 모든 조합 쌍 + 하이라이트 플래그. */
  pairs: ComboPairHighlighted[]
  priorityF: FRange | null
  prioritySS: SSRange | null
  /** 측정 시각. Date.now(). */
  measuredAt: number
}

// ---------------------------------------------------------------------------
// 6. Presets
// ---------------------------------------------------------------------------

export interface Preset {
  id: string
  name: string
  iso: ISO
  ec: EC
  focalZoom: FocalZoom
  priorityF: FRange | null
  prioritySS: SSRange | null
  /** Date.now() 기준 저장 시각. */
  savedAt: number
}

// ---------------------------------------------------------------------------
// 7. App State (UI 전역 상태)
// ---------------------------------------------------------------------------

export interface AppState {
  iso: ISO
  ec: EC
  focalZoom: FocalZoom
  device: Device | null
  priorityF: FRange | null
  prioritySS: SSRange | null
  zoneSysEnabled: boolean
  /** 마지막 EV 측정값(없으면 null). */
  lastEV: EV | null
  /** MEASURE 버튼으로 확정 저장한 측정 로그. */
  measureLog: EVResult[]
  presets: Preset[]
}
