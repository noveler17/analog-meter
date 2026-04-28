// AnalogMeter — Device Database (iPhone 13~17, Galaxy S22~S26).
// 35mm 환산 초점거리 + 고정 최대 조리개 + 줌 배율.
// 데이터 소스: Apple/Samsung 공식 사양표(2021~2026).
// 인터페이스는 src/types.ts (`Device`, `CameraLens`) 를 그대로 따른다.

import type { Device, FocalLength35mm, FocalZoom } from '../types'
import { FOCAL_ZOOM_MAX } from '../tokens'

export const DEVICE_DB: Device[] = [
  // ---------- Apple iPhone ----------
  {
    id: 'iphone-13',
    brand: 'apple',
    model: 'iPhone 13',
    sensorSizeMm: 7.0,
    lenses: [
      { focalLength35mm: 13, maxAperture: 2.4, zoomFactor: 0.5, label: 'Ultra Wide 0.5x' },
      { focalLength35mm: 26, maxAperture: 1.6, zoomFactor: 1.0, label: 'Main 1x' },
    ],
  },
  {
    id: 'iphone-13-pro',
    brand: 'apple',
    model: 'iPhone 13 Pro',
    sensorSizeMm: 9.8,
    lenses: [
      { focalLength35mm: 13, maxAperture: 1.8, zoomFactor: 0.5, label: 'Ultra Wide 0.5x' },
      { focalLength35mm: 26, maxAperture: 1.5, zoomFactor: 1.0, label: 'Main 1x' },
      { focalLength35mm: 77, maxAperture: 2.8, zoomFactor: 3.0, label: 'Telephoto 3x' },
    ],
  },
  {
    id: 'iphone-14',
    brand: 'apple',
    model: 'iPhone 14',
    sensorSizeMm: 7.5,
    lenses: [
      { focalLength35mm: 13, maxAperture: 2.4, zoomFactor: 0.5, label: 'Ultra Wide 0.5x' },
      { focalLength35mm: 26, maxAperture: 1.5, zoomFactor: 1.0, label: 'Main 1x' },
    ],
  },
  {
    id: 'iphone-14-pro',
    brand: 'apple',
    model: 'iPhone 14 Pro',
    sensorSizeMm: 9.8,
    lenses: [
      { focalLength35mm: 13, maxAperture: 2.2, zoomFactor: 0.5, label: 'Ultra Wide 0.5x' },
      { focalLength35mm: 24, maxAperture: 1.78, zoomFactor: 1.0, label: 'Main 1x' },
      { focalLength35mm: 48, maxAperture: 1.78, zoomFactor: 2.0, label: 'Main 2x (crop)' },
      { focalLength35mm: 77, maxAperture: 2.8, zoomFactor: 3.0, label: 'Telephoto 3x' },
    ],
  },
  {
    id: 'iphone-15',
    brand: 'apple',
    model: 'iPhone 15',
    sensorSizeMm: 9.8,
    lenses: [
      { focalLength35mm: 13, maxAperture: 2.4, zoomFactor: 0.5, label: 'Ultra Wide 0.5x' },
      { focalLength35mm: 26, maxAperture: 1.6, zoomFactor: 1.0, label: 'Main 1x' },
      { focalLength35mm: 52, maxAperture: 1.6, zoomFactor: 2.0, label: 'Main 2x (crop)' },
    ],
  },
  {
    id: 'iphone-15-pro',
    brand: 'apple',
    model: 'iPhone 15 Pro',
    sensorSizeMm: 9.8,
    lenses: [
      { focalLength35mm: 13, maxAperture: 2.2, zoomFactor: 0.5, label: 'Ultra Wide 0.5x' },
      { focalLength35mm: 24, maxAperture: 1.78, zoomFactor: 1.0, label: 'Main 1x' },
      { focalLength35mm: 48, maxAperture: 1.78, zoomFactor: 2.0, label: 'Main 2x (crop)' },
      { focalLength35mm: 77, maxAperture: 2.8, zoomFactor: 3.0, label: 'Telephoto 3x' },
    ],
  },
  {
    id: 'iphone-15-pro-max',
    brand: 'apple',
    model: 'iPhone 15 Pro Max',
    sensorSizeMm: 9.8,
    lenses: [
      { focalLength35mm: 13, maxAperture: 2.2, zoomFactor: 0.5, label: 'Ultra Wide 0.5x' },
      { focalLength35mm: 24, maxAperture: 1.78, zoomFactor: 1.0, label: 'Main 1x' },
      { focalLength35mm: 48, maxAperture: 1.78, zoomFactor: 2.0, label: 'Main 2x (crop)' },
      { focalLength35mm: 120, maxAperture: 2.8, zoomFactor: 5.0, label: 'Tetraprism 5x' },
    ],
  },
  {
    id: 'iphone-16',
    brand: 'apple',
    model: 'iPhone 16',
    sensorSizeMm: 9.8,
    lenses: [
      { focalLength35mm: 13, maxAperture: 2.2, zoomFactor: 0.5, label: 'Ultra Wide 0.5x' },
      { focalLength35mm: 26, maxAperture: 1.6, zoomFactor: 1.0, label: 'Main 1x' },
      { focalLength35mm: 52, maxAperture: 1.6, zoomFactor: 2.0, label: 'Main 2x (crop)' },
    ],
  },
  {
    id: 'iphone-16-pro',
    brand: 'apple',
    model: 'iPhone 16 Pro',
    sensorSizeMm: 9.8,
    lenses: [
      { focalLength35mm: 13, maxAperture: 2.2, zoomFactor: 0.5, label: 'Ultra Wide 0.5x' },
      { focalLength35mm: 24, maxAperture: 1.78, zoomFactor: 1.0, label: 'Main 1x' },
      { focalLength35mm: 48, maxAperture: 1.78, zoomFactor: 2.0, label: 'Main 2x (crop)' },
      { focalLength35mm: 120, maxAperture: 2.8, zoomFactor: 5.0, label: 'Tetraprism 5x' },
    ],
  },
  {
    id: 'iphone-17',
    brand: 'apple',
    model: 'iPhone 17',
    sensorSizeMm: 9.8,
    lenses: [
      { focalLength35mm: 13, maxAperture: 2.2, zoomFactor: 0.5, label: 'Ultra Wide 0.5x' },
      { focalLength35mm: 26, maxAperture: 1.6, zoomFactor: 1.0, label: 'Main 1x' },
      { focalLength35mm: 52, maxAperture: 1.6, zoomFactor: 2.0, label: 'Main 2x (crop)' },
    ],
  },
  {
    id: 'iphone-17-pro',
    brand: 'apple',
    model: 'iPhone 17 Pro',
    sensorSizeMm: 9.8,
    lenses: [
      { focalLength35mm: 13, maxAperture: 2.2, zoomFactor: 0.5, label: 'Ultra Wide 0.5x' },
      { focalLength35mm: 24, maxAperture: 1.78, zoomFactor: 1.0, label: 'Main 1x' },
      { focalLength35mm: 48, maxAperture: 1.78, zoomFactor: 2.0, label: 'Main 2x (crop)' },
      { focalLength35mm: 120, maxAperture: 2.8, zoomFactor: 5.0, label: 'Tetraprism 5x' },
    ],
  },

  // ---------- Samsung Galaxy ----------
  {
    id: 'galaxy-s22',
    brand: 'samsung',
    model: 'Galaxy S22',
    sensorSizeMm: 8.0,
    lenses: [
      { focalLength35mm: 13, maxAperture: 2.2, zoomFactor: 0.6, label: 'Ultra Wide 0.6x' },
      { focalLength35mm: 26, maxAperture: 1.8, zoomFactor: 1.0, label: 'Main 1x' },
      { focalLength35mm: 69, maxAperture: 2.4, zoomFactor: 3.0, label: 'Telephoto 3x' },
    ],
  },
  {
    id: 'galaxy-s22-ultra',
    brand: 'samsung',
    model: 'Galaxy S22 Ultra',
    sensorSizeMm: 9.8,
    lenses: [
      { focalLength35mm: 13, maxAperture: 2.2, zoomFactor: 0.6, label: 'Ultra Wide 0.6x' },
      { focalLength35mm: 23, maxAperture: 1.8, zoomFactor: 1.0, label: 'Main 1x' },
      { focalLength35mm: 70, maxAperture: 2.4, zoomFactor: 3.0, label: 'Telephoto 3x' },
      { focalLength35mm: 230, maxAperture: 4.9, zoomFactor: 10.0, label: 'Periscope 10x' },
    ],
  },
  {
    id: 'galaxy-s23',
    brand: 'samsung',
    model: 'Galaxy S23',
    sensorSizeMm: 8.0,
    lenses: [
      { focalLength35mm: 13, maxAperture: 2.2, zoomFactor: 0.6, label: 'Ultra Wide 0.6x' },
      { focalLength35mm: 24, maxAperture: 1.7, zoomFactor: 1.0, label: 'Main 1x' },
      { focalLength35mm: 69, maxAperture: 2.4, zoomFactor: 3.0, label: 'Telephoto 3x' },
    ],
  },
  {
    id: 'galaxy-s23-ultra',
    brand: 'samsung',
    model: 'Galaxy S23 Ultra',
    sensorSizeMm: 9.8,
    lenses: [
      { focalLength35mm: 13, maxAperture: 2.2, zoomFactor: 0.6, label: 'Ultra Wide 0.6x' },
      { focalLength35mm: 23, maxAperture: 1.7, zoomFactor: 1.0, label: 'Main 1x' },
      { focalLength35mm: 70, maxAperture: 2.4, zoomFactor: 3.0, label: 'Telephoto 3x' },
      { focalLength35mm: 230, maxAperture: 4.9, zoomFactor: 10.0, label: 'Periscope 10x' },
    ],
  },
  {
    id: 'galaxy-s24',
    brand: 'samsung',
    model: 'Galaxy S24',
    sensorSizeMm: 8.0,
    lenses: [
      { focalLength35mm: 13, maxAperture: 2.2, zoomFactor: 0.6, label: 'Ultra Wide 0.6x' },
      { focalLength35mm: 24, maxAperture: 1.8, zoomFactor: 1.0, label: 'Main 1x' },
      { focalLength35mm: 67, maxAperture: 2.4, zoomFactor: 3.0, label: 'Telephoto 3x' },
    ],
  },
  {
    id: 'galaxy-s24-ultra',
    brand: 'samsung',
    model: 'Galaxy S24 Ultra',
    sensorSizeMm: 9.8,
    lenses: [
      { focalLength35mm: 13, maxAperture: 2.2, zoomFactor: 0.6, label: 'Ultra Wide 0.6x' },
      { focalLength35mm: 24, maxAperture: 1.7, zoomFactor: 1.0, label: 'Main 1x' },
      { focalLength35mm: 50, maxAperture: 3.4, zoomFactor: 2.0, label: 'Telephoto 2x' },
      { focalLength35mm: 111, maxAperture: 3.4, zoomFactor: 5.0, label: 'Periscope 5x' },
    ],
  },
  {
    id: 'galaxy-s25',
    brand: 'samsung',
    model: 'Galaxy S25',
    sensorSizeMm: 8.0,
    lenses: [
      { focalLength35mm: 13, maxAperture: 2.2, zoomFactor: 0.6, label: 'Ultra Wide 0.6x' },
      { focalLength35mm: 24, maxAperture: 1.8, zoomFactor: 1.0, label: 'Main 1x' },
      { focalLength35mm: 67, maxAperture: 2.4, zoomFactor: 3.0, label: 'Telephoto 3x' },
    ],
  },
  {
    id: 'galaxy-s25-ultra',
    brand: 'samsung',
    model: 'Galaxy S25 Ultra',
    sensorSizeMm: 9.8,
    lenses: [
      { focalLength35mm: 13, maxAperture: 1.9, zoomFactor: 0.6, label: 'Ultra Wide 0.6x' },
      { focalLength35mm: 24, maxAperture: 1.7, zoomFactor: 1.0, label: 'Main 1x' },
      { focalLength35mm: 67, maxAperture: 2.4, zoomFactor: 3.0, label: 'Telephoto 3x' },
      { focalLength35mm: 111, maxAperture: 3.4, zoomFactor: 5.0, label: 'Periscope 5x' },
    ],
  },
  {
    id: 'galaxy-s26',
    brand: 'samsung',
    model: 'Galaxy S26',
    sensorSizeMm: 8.0,
    lenses: [
      { focalLength35mm: 13, maxAperture: 2.2, zoomFactor: 0.6, label: 'Ultra Wide 0.6x' },
      { focalLength35mm: 24, maxAperture: 1.8, zoomFactor: 1.0, label: 'Main 1x' },
      { focalLength35mm: 67, maxAperture: 2.4, zoomFactor: 3.0, label: 'Telephoto 3x' },
    ],
  },
  {
    id: 'galaxy-s26-ultra',
    brand: 'samsung',
    model: 'Galaxy S26 Ultra',
    sensorSizeMm: 9.8,
    lenses: [
      { focalLength35mm: 13, maxAperture: 1.9, zoomFactor: 0.6, label: 'Ultra Wide 0.6x' },
      { focalLength35mm: 24, maxAperture: 1.7, zoomFactor: 1.0, label: 'Main 1x' },
      { focalLength35mm: 67, maxAperture: 2.4, zoomFactor: 3.0, label: 'Telephoto 3x' },
      { focalLength35mm: 111, maxAperture: 3.4, zoomFactor: 5.0, label: 'Periscope 5x' },
    ],
  },
]

/**
 * 슬러그(id)로 검색.
 */
export function getDeviceById(id: string): Device | null {
  return DEVICE_DB.find((d) => d.id === id) ?? null
}

/** Main(1x) 렌즈의 35mm 환산 mm. 없을 때 24 fallback. */
export function getMainFocalMm(device: Device | null): FocalLength35mm {
  return device?.lenses.find((l) => l.zoomFactor === 1.0)?.focalLength35mm ?? 24
}

/**
 * 사용자가 선택한 mm 값을 카메라 트랙에 보낼 zoomFactor 로 환산.
 *  - main lens(1x) 기준 비례. ultra-wide 는 0.5x 이하까지 허용 (하한 0.5).
 *  - 상한은 FOCAL_ZOOM_MAX (5.0).
 */
export function focalLengthToZoom(
  focalLength35mm: FocalLength35mm,
  device: Device | null,
): FocalZoom {
  const main = getMainFocalMm(device)
  if (!Number.isFinite(focalLength35mm) || focalLength35mm <= 0) return 1.0
  const ratio = focalLength35mm / main
  return Math.max(0.5, Math.min(FOCAL_ZOOM_MAX, ratio))
}

/**
 * User-Agent 기반 디바이스 감지 (best-effort).
 *   - iOS UA에는 정확한 모델명이 노출되지 않으므로, iPhone일 경우엔 최신 일반 모델로 fallback.
 *   - Android는 model 토큰(예: 'SM-S928') 매칭 시도.
 */
export function detectDevice(ua: string): Device | null {
  if (!ua) return null
  const u = ua.toLowerCase()

  // 명시적 모델 슬러그 매칭 (디버그 / Custom UA)
  for (const d of DEVICE_DB) {
    const slug = d.id.toLowerCase()
    if (u.includes(slug)) return d
  }

  // Samsung SM-S 코드 (대표적인 매핑)
  const samsungMap: Record<string, string> = {
    'sm-s901': 'galaxy-s22',
    'sm-s906': 'galaxy-s22', // S22+ → S22 그룹으로 매핑
    'sm-s908': 'galaxy-s22-ultra',
    'sm-s911': 'galaxy-s23',
    'sm-s916': 'galaxy-s23',
    'sm-s918': 'galaxy-s23-ultra',
    'sm-s921': 'galaxy-s24',
    'sm-s926': 'galaxy-s24',
    'sm-s928': 'galaxy-s24-ultra',
    'sm-s931': 'galaxy-s25',
    'sm-s936': 'galaxy-s25',
    'sm-s938': 'galaxy-s25-ultra',
  }
  for (const [code, id] of Object.entries(samsungMap)) {
    if (u.includes(code)) return getDeviceById(id)
  }

  // iPhone fallback — 최신 일반 모델로.
  if (u.includes('iphone')) {
    return getDeviceById('iphone-17') ?? getDeviceById('iphone-16')
  }
  // Android Samsung fallback
  if (u.includes('samsung') || u.includes('sm-s')) {
    return getDeviceById('galaxy-s25')
  }
  return null
}
