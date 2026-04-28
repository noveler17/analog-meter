// AnalogMeter — Design System Tokens
// 색상/사이즈는 반드시 이 파일의 상수로만 참조한다.
// CSS/TSX에 색상을 직접 하드코딩하지 않는다 (qa-inspector가 검사).

// ---------------------------------------------------------------------------
// 1. Colors
// ---------------------------------------------------------------------------

export const BG_BLACK = '#000000' as const
export const CLOVER_GREEN = '#00FF41' as const

export const COLORS = {
  /** Pure black 배경 — PRD 5장. */
  BG: BG_BLACK,
  /** Clover Green 액센트 — PRD 5장. */
  GREEN: CLOVER_GREEN,
  /** 다이얼/버튼 비활성 상태. */
  GREEN_DIM: '#00CC33',
  /** 글로우 효과 (alpha 20%). */
  GREEN_GLOW: '#00FF4133',
  /** GitHub 로고 등 정체성 유지용 흰색. PRD 2.3. */
  WHITE: '#FFFFFF',
  GRAY_900: '#111111',
  GRAY_800: '#1A1A1A',
  GRAY_700: '#2A2A2A',
  GRAY_500: '#555555',
  GRAY_300: '#888888',
  /** 경고/오버레인지 인디케이터. */
  RED_WARN: '#FF3B30',
} as const

// ---------------------------------------------------------------------------
// 2. Typography
// ---------------------------------------------------------------------------

export const TYPOGRAPHY = {
  FONT_MONO: "'SF Mono', 'Courier New', monospace",
  FONT_SANS: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  SIZE_XS: '10px',
  SIZE_SM: '12px',
  SIZE_MD: '14px',
  SIZE_LG: '18px',
  SIZE_XL: '24px',
  SIZE_2XL: '32px',
} as const

// ---------------------------------------------------------------------------
// 3. Spacing & Touch
// ---------------------------------------------------------------------------

/** WCAG + Apple HIG 최소 터치 타겟 (px). PRD 5장. */
export const TOUCH_TARGET_MIN = 44 as const

export const SPACING = {
  /** WCAG + Apple HIG 최소 터치 타겟. PRD 5장. */
  TOUCH_TARGET: TOUCH_TARGET_MIN,
  XS: 4,
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 24,
  XXL: 32,
} as const

// ---------------------------------------------------------------------------
// 4. Zones — 무채색 그라데이션 (Zone System)
// ---------------------------------------------------------------------------

/**
 * Zone 0 ~ X 무채색 단계 (PRD 2.1 Zone Bar 시각화).
 * Zone V(중간 회색) 기준 18% 그레이로 환산.
 */
export const ZONE_GRADIENT_STEPS = [
  '#000000', // Zone 0  — pure black
  '#1A1A1A', // Zone I
  '#333333', // Zone II
  '#4D4D4D', // Zone III — dark shadow with detail
  '#666666', // Zone IV — shadow detail
  '#808080', // Zone V  — middle gray (18%)
  '#999999', // Zone VI — light skin tone
  '#B3B3B3', // Zone VII — bright highlight with detail
  '#CCCCCC', // Zone VIII — near white
  '#E6E6E6', // Zone IX
  '#FFFFFF', // Zone X  — pure white
] as const

export const ZONES = {
  COLORS: ZONE_GRADIENT_STEPS,
  /** PRD: Zone Bar는 Zone III ~ VII를 무채색 그라데이션으로 표시. */
  BAR_MIN: 3,
  BAR_MAX: 7,
} as const

// ---------------------------------------------------------------------------
// 5. Exposure Constants (1/3 스탑 시리즈)
// ---------------------------------------------------------------------------

/** ISO 25부터 시작하는 1/3 스탑 시리즈 (PRD 3.2). */
export const ISO_VALUES = [
  25, 32, 40, 50, 64, 80,
  100, 125, 160, 200, 250, 320,
  400, 500, 640, 800, 1000, 1250,
  1600, 2000, 2500, 3200, 4000, 5000,
  6400, 8000, 10000, 12800, 16000, 20000, 25600,
] as const

/** 노출 보정 1/3 스탑 시리즈 (-3.0 ~ +3.0). */
export const EC_VALUES = [
  -3.0, -2.7, -2.3, -2.0, -1.7, -1.3, -1.0, -0.7, -0.3,
  0.0,
  0.3, 0.7, 1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0,
] as const

/** 조리개 f-number 1/3 스탑 시리즈 (f/1.2 ~ f/22). */
export const F_STOP_VALUES = [
  1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.5, 2.8, 3.2, 3.5, 4.0, 4.5,
  5.0, 5.6, 6.3, 7.1, 8.0, 9.0, 10, 11, 13, 14, 16, 18, 20, 22,
] as const

/**
 * 셔터 스피드 1/3 스탑 시리즈 (초 단위). 30s ~ 1/8000s.
 * 양수=초, 분수=1/N초. 표시 라벨은 별도로 매핑.
 */
export const SHUTTER_VALUES = [
  30, 25, 20, 15, 13, 10, 8, 6, 5, 4, 3.2, 2.5, 2, 1.6, 1.3,
  1, 0.8, 0.6, 0.5, 0.4, 0.3, 1 / 4, 1 / 5, 1 / 6, 1 / 8, 1 / 10, 1 / 13,
  1 / 15, 1 / 20, 1 / 25, 1 / 30, 1 / 40, 1 / 50, 1 / 60, 1 / 80, 1 / 100,
  1 / 125, 1 / 160, 1 / 200, 1 / 250, 1 / 320, 1 / 400, 1 / 500, 1 / 640,
  1 / 800, 1 / 1000, 1 / 1250, 1 / 1600, 1 / 2000, 1 / 2500, 1 / 3200,
  1 / 4000, 1 / 5000, 1 / 6400, 1 / 8000,
] as const

/** 줌 배율 범위 (PRD 2.3). */
export const FOCAL_ZOOM_MIN = 1.0 as const
export const FOCAL_ZOOM_MAX = 5.0 as const

// ---------------------------------------------------------------------------
// 6. Animation / Performance
// ---------------------------------------------------------------------------

export const PERF = {
  /** 60fps 유지 목표 — Worker 측정 주기 (ms). */
  WORKER_INTERVAL_MS: 1000 / 30,
  /** UI 렌더 throttle (ms). */
  UI_THROTTLE_MS: 1000 / 60,
} as const
