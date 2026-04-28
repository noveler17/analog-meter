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
// 1. localStorage helpers
// ---------------------------------------------------------------------------

const PRESET_KEY = 'analog-meter:presets'
const PRIORITY_KEY = 'analog-meter:priority'
const LAST_ZONE_KEY = 'analog-meter:last-zone'
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

interface PriorityPersist {
  f: FRange | null
  ss: SSRange | null
}

function loadPriorityFromStorage(): PriorityPersist {
  try {
    const raw = localStorage.getItem(PRIORITY_KEY)
    if (!raw) return { f: null, ss: null }
    const parsed = JSON.parse(raw)
    return {
      f: Array.isArray(parsed?.f) && parsed.f.length === 2 ? (parsed.f as FRange) : null,
      ss: Array.isArray(parsed?.ss) && parsed.ss.length === 2 ? (parsed.ss as SSRange) : null,
    }
  } catch {
    return { f: null, ss: null }
  }
}

function savePriorityToStorage(p: PriorityPersist): void {
  try {
    localStorage.setItem(PRIORITY_KEY, JSON.stringify(p))
  } catch {
    /* ignore */
  }
}

function loadLastZoneFromStorage(): ZoneIndex {
  try {
    const raw = localStorage.getItem(LAST_ZONE_KEY)
    if (raw === null) return 5
    const n = Number(raw)
    if (Number.isInteger(n) && n >= 0 && n <= 10) return n as ZoneIndex
    return 5
  } catch {
    return 5
  }
}

function saveLastZoneToStorage(z: ZoneIndex): void {
  try {
    localStorage.setItem(LAST_ZONE_KEY, String(z))
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// 2. State shape & reducer
// ---------------------------------------------------------------------------

interface SpotMarker {
  id: string
  x: number
  y: number
  /** ISO/EC 가 반영된 EV (UI 표시용). */
  ev: EV
  /** ISO 100 / EC 0 기준 raw EV — Zone 보정에 사용. */
  evRaw: EV
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
  /** 마지막으로 사용자가 선택했던 Zone — 다음에 ZS 켤 때 복원. 영속. */
  lastSelectedZone: ZoneIndex
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
  | { type: 'select-zone'; zone: ZoneIndex }
  | { type: 'select-spot'; id: string | null }
  | { type: 'apply-live'; result: EVResult; zone: ZoneIndex }
  | { type: 'push-measure'; result: EVResult }
  | { type: 'add-spot'; marker: SpotMarker }
  | { type: 'clear-spots' }
  | { type: 'set-presets'; presets: Preset[] }
  | { type: 'apply-preset'; preset: Preset; mainMm: FocalLength35mm }
  | { type: 'init-persist'; priorityF: FRange | null; prioritySS: SSRange | null; lastZone: ZoneIndex }

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
      // 토글 ON 시 기본/마지막 zone 복원. OFF 시 selection 정리.
      return action.enabled
        ? {
            ...state,
            zoneSysEnabled: true,
            selectedZone: state.lastSelectedZone,
          }
        : {
            ...state,
            zoneSysEnabled: false,
            selectedZone: null,
            selectedSpotId: null,
            spotMarkers: [],
          }
    case 'select-zone':
      return {
        ...state,
        selectedZone: action.zone,
        lastSelectedZone: action.zone,
      }
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
        liveResult: action.result,
        lastEV: action.result.ev,
      }
    case 'add-spot':
      // 한 번에 spot 한 개만. 새 탭은 이전 spot 을 교체.
      return {
        ...state,
        spotMarkers: [action.marker],
        selectedSpotId: action.marker.id,
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
    case 'init-persist':
      return {
        ...state,
        priorityF: action.priorityF,
        prioritySS: action.prioritySS,
        lastSelectedZone: action.lastZone,
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
  lastSelectedZone: 5,
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
  setSelectedZone: (z: ZoneIndex) => void
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

  // 1) 부팅: 디바이스 자동 감지 + Preset/Priority/LastZone 영속 복원.
  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const detected = detectDevice(ua) ?? getDeviceById('iphone-16')
    dispatch({ type: 'set-device', device: detected })
    dispatch({ type: 'set-presets', presets: loadPresetsFromStorage() })
    const priority = loadPriorityFromStorage()
    const lastZone = loadLastZoneFromStorage()
    dispatch({
      type: 'init-persist',
      priorityF: priority.f,
      prioritySS: priority.ss,
      lastZone,
    })
  }, [])

  // 2) Preset/Priority/LastZone 변경 시 localStorage 동기화.
  useEffect(() => {
    savePresetsToStorage(state.presets)
  }, [state.presets])

  useEffect(() => {
    savePriorityToStorage({ f: state.priorityF, ss: state.prioritySS })
  }, [state.priorityF, state.prioritySS])

  useEffect(() => {
    saveLastZoneToStorage(state.lastSelectedZone)
  }, [state.lastSelectedZone])

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
    (z: ZoneIndex) => dispatch({ type: 'select-zone', zone: z }),
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
