// AnalogMeter — Global App State (React Context).
// 모든 다이얼/프리셋/측정 로그 상태를 단일 트리에 보관한다.
// EVResult shape 은 contracts.md (Section E) 와 1:1 일치.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import type {
  EC,
  EV,
  EVResult,
  FRange,
  FocalLength35mm,
  ISO,
  Preset,
  SSRange,
  Device,
  ZoneIndex,
} from '../types'
import { detectDevice, getDeviceById } from '../lib/devices'

// Main(1x) 렌즈의 35mm 환산 mm. fallback 24 (요즘 폰 기준).
function mainFocal(device: Device | null): FocalLength35mm {
  return device?.lenses.find((l) => l.zoomFactor === 1.0)?.focalLength35mm ?? 24
}

// ---------------------------------------------------------------------------
// 1. localStorage helpers (Preset 저장)
// ---------------------------------------------------------------------------

const PRESET_KEY = 'analog-meter:presets'
const MAX_PRESETS = 10

function loadPresetsFromStorage(): Preset[] {
  try {
    const raw = localStorage.getItem(PRESET_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as Preset[]
  } catch {
    return []
  }
}

function savePresetsToStorage(presets: Preset[]): void {
  try {
    localStorage.setItem(PRESET_KEY, JSON.stringify(presets))
  } catch {
    // private mode / quota — 메모리 폴백 (state 는 유지됨).
  }
}

// ---------------------------------------------------------------------------
// 2. State shape & reducer
// ---------------------------------------------------------------------------

interface SpotMarker {
  id: string
  x: number
  y: number
  zone: ZoneIndex
  ev: EV
}

export interface AppStateValue {
  iso: ISO
  ec: EC
  focalLength35mm: FocalLength35mm
  device: Device | null
  priorityF: FRange | null
  prioritySS: SSRange | null
  zoneSysEnabled: boolean
  /** Zone System 모드에서 사용자가 선택한 목표 Zone. */
  selectedZone: ZoneIndex | null
  /** Zone System 모드에서 보정 기준 spot의 id. */
  selectedSpotId: string | null
  lastEV: EV | null
  currentZone: ZoneIndex | null
  measureLog: EVResult[]
  presets: Preset[]
  /** 마지막으로 수신한 EVResult — MEASURE 버튼이 push 할 페이로드 후보. */
  liveResult: EVResult | null
  spotMarkers: SpotMarker[]
}

type Action =
  | { type: 'set-iso'; iso: ISO }
  | { type: 'set-ec'; ec: EC }
  | { type: 'set-focal-length'; focalLength35mm: FocalLength35mm }
  | { type: 'set-device'; device: Device | null }
  | { type: 'set-priority'; priorityF: FRange | null; prioritySS: SSRange | null }
  | { type: 'set-zone-sys'; enabled: boolean }
  | { type: 'select-zone'; zone: ZoneIndex | null }
  | { type: 'select-spot'; id: string | null }
  | { type: 'apply-live'; result: EVResult; zone: ZoneIndex }
  | { type: 'push-measure'; result: EVResult }
  | { type: 'add-spot'; marker: SpotMarker }
  | { type: 'clear-spots' }
  | { type: 'set-presets'; presets: Preset[] }
  | { type: 'apply-preset'; preset: Preset; mainMm: FocalLength35mm }

function reducer(state: AppStateValue, action: Action): AppStateValue {
  switch (action.type) {
    case 'set-iso':
      return { ...state, iso: action.iso }
    case 'set-ec':
      return { ...state, ec: action.ec }
    case 'set-focal-length':
      return { ...state, focalLength35mm: action.focalLength35mm }
    case 'set-device': {
      // 디바이스 변경 시 main lens mm로 focal length 정렬(이전이 같은 mm가 아닐 때만).
      const nextMain = mainFocal(action.device)
      const focal = state.focalLength35mm > 0 ? state.focalLength35mm : nextMain
      return { ...state, device: action.device, focalLength35mm: focal }
    }
    case 'set-priority':
      return {
        ...state,
        priorityF: action.priorityF,
        prioritySS: action.prioritySS,
      }
    case 'set-zone-sys':
      // 토글 OFF 시 selection 도 함께 해제.
      return action.enabled
        ? { ...state, zoneSysEnabled: true }
        : {
            ...state,
            zoneSysEnabled: false,
            selectedZone: null,
            selectedSpotId: null,
            spotMarkers: [],
          }
    case 'select-zone':
      return { ...state, selectedZone: action.zone }
    case 'select-spot':
      return { ...state, selectedSpotId: action.id }
    case 'apply-live':
      return {
        ...state,
        lastEV: action.result.ev,
        currentZone: action.zone,
        liveResult: action.result,
      }
    case 'push-measure':
      return {
        ...state,
        measureLog: [...state.measureLog, action.result].slice(-50),
      }
    case 'add-spot': {
      const next = [...state.spotMarkers, action.marker].slice(-3)
      // 새 spot은 자동 선택. 사용자가 명시적으로 다른 spot을 선택했다면 유지하지 않고 최신으로 갱신.
      return {
        ...state,
        spotMarkers: next,
        selectedSpotId: action.marker.id,
      }
    }
    case 'clear-spots':
      return { ...state, spotMarkers: [], selectedSpotId: null }
    case 'set-presets':
      return { ...state, presets: action.presets }
    case 'apply-preset': {
      const p = action.preset
      // legacy focalZoom 만 있는 preset은 mainMm을 곱해서 mm로 환원.
      const focal =
        typeof p.focalLength35mm === 'number' && p.focalLength35mm > 0
          ? p.focalLength35mm
          : typeof p.focalZoom === 'number'
            ? p.focalZoom * action.mainMm
            : action.mainMm
      return {
        ...state,
        iso: p.iso,
        ec: p.ec,
        focalLength35mm: focal,
        priorityF: p.priorityF,
        prioritySS: p.prioritySS,
      }
    }
    default:
      return state
  }
}

const initialState: AppStateValue = {
  iso: 100,
  ec: 0,
  focalLength35mm: 24,
  device: null,
  priorityF: null,
  prioritySS: null,
  zoneSysEnabled: false,
  selectedZone: null,
  selectedSpotId: null,
  lastEV: null,
  currentZone: null,
  measureLog: [],
  presets: [],
  liveResult: null,
  spotMarkers: [],
}

// ---------------------------------------------------------------------------
// 3. Context
// ---------------------------------------------------------------------------

export interface AppStateAPI extends AppStateValue {
  setISO: (v: ISO) => void
  setEC: (v: EC) => void
  setFocalLength35mm: (v: FocalLength35mm) => void
  setDevice: (d: Device | null) => void
  setPriority: (f: FRange | null, ss: SSRange | null) => void
  setZoneSysEnabled: (b: boolean) => void
  setSelectedZone: (z: ZoneIndex | null) => void
  setSelectedSpot: (id: string | null) => void
  applyLive: (result: EVResult, zone: ZoneIndex) => void
  pushMeasure: (result: EVResult) => void
  addSpot: (marker: SpotMarker) => void
  clearSpots: () => void
  savePreset: (name: string) => void
  loadPreset: (id: string) => void
  deletePreset: (id: string) => void
}

const AppStateContext = createContext<AppStateAPI | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // 1) 부팅: 디바이스 자동 감지 + Preset 복원.
  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const detected = detectDevice(ua) ?? getDeviceById('iphone-16')
    dispatch({ type: 'set-device', device: detected })
    dispatch({ type: 'set-presets', presets: loadPresetsFromStorage() })
  }, [])

  // 2) Preset 변경 시 localStorage 동기화.
  useEffect(() => {
    savePresetsToStorage(state.presets)
  }, [state.presets])

  // 3) 액션 디스패처 — 안정 참조.
  const setISO = useCallback((v: ISO) => dispatch({ type: 'set-iso', iso: v }), [])
  const setEC = useCallback((v: EC) => dispatch({ type: 'set-ec', ec: v }), [])
  const setFocalLength35mm = useCallback(
    (v: FocalLength35mm) => dispatch({ type: 'set-focal-length', focalLength35mm: v }),
    [],
  )
  const setDevice = useCallback(
    (d: Device | null) => dispatch({ type: 'set-device', device: d }),
    [],
  )
  const setPriority = useCallback(
    (f: FRange | null, ss: SSRange | null) =>
      dispatch({ type: 'set-priority', priorityF: f, prioritySS: ss }),
    [],
  )
  const setZoneSysEnabled = useCallback(
    (b: boolean) => dispatch({ type: 'set-zone-sys', enabled: b }),
    [],
  )
  const setSelectedZone = useCallback(
    (z: ZoneIndex | null) => dispatch({ type: 'select-zone', zone: z }),
    [],
  )
  const setSelectedSpot = useCallback(
    (id: string | null) => dispatch({ type: 'select-spot', id }),
    [],
  )
  const applyLive = useCallback(
    (result: EVResult, zone: ZoneIndex) =>
      dispatch({ type: 'apply-live', result, zone }),
    [],
  )
  const pushMeasure = useCallback(
    (result: EVResult) => dispatch({ type: 'push-measure', result }),
    [],
  )
  const addSpot = useCallback(
    (marker: SpotMarker) => dispatch({ type: 'add-spot', marker }),
    [],
  )
  const clearSpots = useCallback(() => dispatch({ type: 'clear-spots' }), [])

  const savePreset = useCallback(
    (name: string) => {
      const preset: Preset = {
        id: `preset-${Date.now()}`,
        name: name || `Preset ${state.presets.length + 1}`,
        iso: state.iso,
        ec: state.ec,
        focalLength35mm: state.focalLength35mm,
        priorityF: state.priorityF,
        prioritySS: state.prioritySS,
        savedAt: Date.now(),
      }
      const updated = [...state.presets, preset].slice(-MAX_PRESETS)
      dispatch({ type: 'set-presets', presets: updated })
    },
    [
      state.iso,
      state.ec,
      state.focalLength35mm,
      state.priorityF,
      state.prioritySS,
      state.presets,
    ],
  )

  const loadPreset = useCallback(
    (id: string) => {
      const preset = state.presets.find((p) => p.id === id)
      if (preset) {
        dispatch({
          type: 'apply-preset',
          preset,
          mainMm: mainFocal(state.device),
        })
      }
    },
    [state.presets, state.device],
  )

  const deletePreset = useCallback(
    (id: string) => {
      const updated = state.presets.filter((p) => p.id !== id)
      dispatch({ type: 'set-presets', presets: updated })
    },
    [state.presets],
  )

  const api = useMemo<AppStateAPI>(
    () => ({
      ...state,
      setISO,
      setEC,
      setFocalLength35mm,
      setDevice,
      setPriority,
      setZoneSysEnabled,
      setSelectedZone,
      setSelectedSpot,
      applyLive,
      pushMeasure,
      addSpot,
      clearSpots,
      savePreset,
      loadPreset,
      deletePreset,
    }),
    [
      state,
      setISO,
      setEC,
      setFocalLength35mm,
      setDevice,
      setPriority,
      setZoneSysEnabled,
      setSelectedZone,
      setSelectedSpot,
      applyLive,
      pushMeasure,
      addSpot,
      clearSpots,
      savePreset,
      loadPreset,
      deletePreset,
    ],
  )

  return (
    <AppStateContext.Provider value={api}>{children}</AppStateContext.Provider>
  )
}

export function useAppState(): AppStateAPI {
  const ctx = useContext(AppStateContext)
  if (!ctx) {
    throw new Error('useAppState must be used within AppStateProvider')
  }
  return ctx
}
