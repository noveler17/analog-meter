// AnalogMeter — App shell.
// Fixed Top (카메라) / Zone Section (옵션) / Variable Center (콤보) / Fixed Bottom (다이얼) 레이아웃.
// 측정은 스냅샷 모델 — MEASURE 버튼으로만 트리거 (첫 프레임 자동 측정 없음).
// ZS 모드: Zone 먼저 선택 → 화면 탭 → 즉시 Measure.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CameraPreview, type CameraPreviewHandle } from './components/CameraPreview/CameraPreview'
import { ZoneBar } from './components/ZoneSystem/ZoneBar'
import { SpotMeter } from './components/ZoneSystem/SpotMeter'
import { ZSysToggle } from './components/ZoneSystem/ZSysToggle'
import { ComboPairsList } from './components/ComboPairs/ComboPairsList'
import { ISODial } from './components/Dials/ISODial'
import { ECDial } from './components/Dials/ECDial'
import { FocalDial } from './components/Dials/FocalDial'
import { MeasureButton } from './components/MeasureButton/MeasureButton'
import { PresetPanel } from './components/Presets/PresetPanel'
import { AppStateProvider, useAppState, type Theme } from './state/appState'
import { startCamera, type CameraSession } from './lib/camera'
import { focalLengthToZoom, zoomToFocalLength } from './lib/devices'
import {
  applyHighlight,
  classifyZone,
  generateCombos,
  sortByPriority,
} from './lib/exposure-engine'
import type { EVResult, ZoneIndex } from './types'

import styles from './App.module.css'

/**
 * 마지막 측정의 raw 휘도(evRaw)에 ISO/EC/우선순위/존오프셋을 다시 적용해 EVResult 를 만든다.
 * 카메라를 새로 캡처하지 않고 표시 노출만 갱신한다.
 */
function recomputeFromSnapshot(
  base: EVResult,
  iso: number,
  ec: number,
  priorityF: EVResult['priorityF'],
  prioritySS: EVResult['prioritySS'],
  zoneOffset: number = 0,
): EVResult {
  const ev = base.evRaw + Math.log2(iso / 100) - ec - zoneOffset
  const pairs = sortByPriority(
    applyHighlight(generateCombos(ev), priorityF, prioritySS),
  )
  return {
    ...base,
    ev,
    iso,
    ec,
    pairs,
    priorityF,
    prioritySS,
    measuredAt: Date.now(),
  }
}

function AppShell() {
  const state = useAppState()
  // 안정 참조 — 비동기 onMessage 콜백에서 최신 state 읽기 위해 사용.
  const stateRef = useRef(state)
  stateRef.current = state

  const previewRef = useRef<CameraPreviewHandle | null>(null)
  const sessionRef = useRef<CameraSession | null>(null)
  const [pairs, setPairs] = useState<EVResult['pairs']>([])
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Preset drawer/naming 상태 — ComboPairsList 헤더 버튼과 PresetPanel을 연결.
  const [presetDrawerOpen, setPresetDrawerOpen] = useState(false)
  const [presetNaming, setPresetNaming] = useState(false)

  // 다이얼은 mm 단위지만 카메라 트랙은 zoom 배율을 받는다 — 어댑터.
  const focalZoom = useMemo(
    () => focalLengthToZoom(state.focalLength35mm, state.device),
    [state.focalLength35mm, state.device],
  )

  // ZS 모드일 때 EV 재합성에 사용할 EC (= 0). main thread 가 다이얼 EC 를 무시하도록.
  const effectiveEC = state.zoneSysEnabled ? 0 : state.ec

  // Zone System 모드에서의 Zone 오프셋 (Zone V = 5 기준).
  const zoneOffset = state.zoneSysEnabled
    ? ((state.selectedZone ?? state.lastSelectedZone) - 5)
    : 0

  // ---- 테마 적용 — document.documentElement.dataset.theme ----
  useEffect(() => {
    if (state.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const apply = () => {
        document.documentElement.dataset.theme = mq.matches ? 'dark' : 'light'
      }
      apply()
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    } else {
      document.documentElement.dataset.theme = state.theme
    }
  }, [state.theme])

  // ---- 카메라 + Worker 부팅 (마운트 1회) ----
  useEffect(() => {
    let cancelled = false
    const video = previewRef.current?.getVideoElement()
    if (!video) return

    ;(async () => {
      try {
        const { session, detectedZoom } = await startCamera({
          video,
          iso: state.iso,
          ec: state.ec,
          focalZoom,
          priorityF: state.priorityF,
          prioritySS: state.prioritySS,
          onMessage: (msg) => {
            if (cancelled) return
            if (msg.type === 'error') {
              setCameraError(msg.error ?? 'unknown camera error')
              return
            }
            if (msg.type === 'ready') {
              setCameraError(null)
              return
            }
            if (msg.type === 'ev-update') {
              const result: EVResult = {
                ev: msg.ev ?? 0,
                evRaw: msg.evRaw ?? 0,
                iso: msg.iso ?? stateRef.current.iso,
                ec: msg.ec ?? stateRef.current.ec,
                pairs: msg.pairs ?? [],
                priorityF: msg.priorityF ?? null,
                prioritySS: msg.prioritySS ?? null,
                measuredAt: msg.measuredAt ?? Date.now(),
              }
              const zone = (msg.zone ?? 5) as ZoneIndex
              stateRef.current.applyLive(result, zone)
              stateRef.current.pushMeasure(result)
              setPairs(result.pairs)
              return
            }
            if (msg.type === 'spot-result' && msg.spot) {
              // ZS 모드: spot 탭 → 즉시 Zone 보정 EV + combinations 계산.
              const cur = stateRef.current
              const spotEvRaw = msg.spot.evRaw
              const selectedZone = cur.selectedZone ?? cur.lastSelectedZone
              const adjEV = spotEvRaw + Math.log2(cur.iso / 100) - (selectedZone - 5)
              const newPairs = sortByPriority(
                applyHighlight(generateCombos(adjEV), cur.priorityF, cur.prioritySS),
              )
              const adjusted: EVResult = {
                ev: adjEV,
                evRaw: spotEvRaw,
                iso: cur.iso,
                ec: 0,
                pairs: newPairs,
                priorityF: cur.priorityF,
                prioritySS: cur.prioritySS,
                measuredAt: Date.now(),
              }
              cur.setSpot({
                id: `spot-${msg.timestamp}`,
                x: msg.spot.x,
                y: msg.spot.y,
                ev: adjEV,
                evRaw: spotEvRaw,
              })
              setPairs(newPairs)
              cur.applyLive(adjusted, selectedZone as ZoneIndex)
              cur.pushMeasure(adjusted)
            }
          },
        })
        if (cancelled) {
          session.stop()
          return
        }
        sessionRef.current = session

        // 카메라 트랙의 현재 zoom → focal length 초기화 (지원 기기에서만).
        if (detectedZoom !== undefined) {
          const cur = stateRef.current
          const detected = zoomToFocalLength(detectedZoom, cur.device)
          cur.setFocalLength35mm(detected)
        }

        // 자동 측정 없음 — 사용자가 MEASURE 버튼을 눌러야 첫 측정 시작.
      } catch (err) {
        if (!cancelled) {
          setCameraError(err instanceof Error ? err.message : 'camera failed')
        }
      }
    })()

    return () => {
      cancelled = true
      sessionRef.current?.stop()
      sessionRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- 다이얼 변경 → Worker 동기화 (다음 spot 측정 정확성 위해) ----
  useEffect(() => {
    sessionRef.current?.send({ type: 'set-iso', iso: state.iso })
  }, [state.iso])

  useEffect(() => {
    sessionRef.current?.send({ type: 'set-ec', ec: state.ec })
  }, [state.ec])

  useEffect(() => {
    sessionRef.current?.send({ type: 'set-focal', focalZoom })
  }, [focalZoom])

  useEffect(() => {
    sessionRef.current?.send({
      type: 'set-priority',
      priorityF: state.priorityF,
      prioritySS: state.prioritySS,
    })
  }, [state.priorityF, state.prioritySS])

  // ---- ISO/EC/Priority/Zone 변경 시 마지막 스냅샷에서 EV/pairs 재합성 ----
  // 카메라를 다시 캡처하지 않고 main thread 가 evRaw 위에 노출 보정만 다시 적용.
  useEffect(() => {
    const base = state.liveResult
    if (!base) return
    const next = recomputeFromSnapshot(
      base,
      state.iso,
      effectiveEC,
      state.priorityF,
      state.prioritySS,
      zoneOffset,
    )
    if (
      next.ev === base.ev &&
      next.iso === base.iso &&
      next.ec === base.ec &&
      next.priorityF === base.priorityF &&
      next.prioritySS === base.prioritySS
    ) {
      return
    }
    state.applyLive(next, classifyZoneFromEvRaw(next.evRaw))
    setPairs(next.pairs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.iso, effectiveEC, state.priorityF, state.prioritySS, state.zoneSysEnabled, state.selectedZone, state.lastSelectedZone])

  // ---- Spot Meter 트리거 ----
  const handleTap = useCallback(
    (nx: number, ny: number) => {
      if (!state.zoneSysEnabled) return
      void sessionRef.current?.requestSpot(nx, ny)
    },
    [state.zoneSysEnabled],
  )

  // ---- MEASURE 버튼 ----
  // ZS OFF: 새 프레임을 캡처해 Worker 에 보낸다 (회신 시 pushMeasure 자동).
  // ZS ON: 마지막 evRaw + selectedZone 으로 main thread 에서 보정만 재적용.
  const handleMeasure = useCallback(() => {
    const session = sessionRef.current
    if (!session) return

    if (!state.zoneSysEnabled) {
      void session.requestMeasure()
      return
    }

    // ZS ON — spot 이 있으면 그 evRaw 사용, 없으면 liveResult.evRaw 사용.
    const base = state.liveResult
    if (!base) {
      // 아직 측정값 없음 — 일반 Measure로 첫 측정.
      void session.requestMeasure()
      return
    }
    const selectedZone = state.selectedZone ?? state.lastSelectedZone
    const baseEvRaw = state.spotMarker ? state.spotMarker.evRaw : base.evRaw
    const adjEV = baseEvRaw + Math.log2(state.iso / 100) - (selectedZone - 5)
    const newPairs = sortByPriority(
      applyHighlight(generateCombos(adjEV), state.priorityF, state.prioritySS),
    )
    const adjusted: EVResult = {
      ...base,
      ev: adjEV,
      evRaw: baseEvRaw,
      iso: state.iso,
      ec: 0,
      pairs: newPairs,
      priorityF: state.priorityF,
      prioritySS: state.prioritySS,
      measuredAt: Date.now(),
    }
    setPairs(newPairs)
    state.pushMeasure(adjusted)
  }, [state])

  const lastMeasuredAt =
    state.measureLog.length > 0
      ? state.measureLog[state.measureLog.length - 1].measuredAt
      : null

  const spotDisplayZone: ZoneIndex = state.selectedZone ?? state.lastSelectedZone

  // 테마 프롭
  const handleThemeChange = useCallback(
    (t: Theme) => state.setTheme(t),
    [state],
  )

  return (
    <div className={styles.app}>
      {/* Fixed Top — 카메라 + Zone Bar (와이드 레이아웃에선 좌측 패널) */}
      <div className={styles.leftPanel}>
        <header className={styles.topSection}>
          <CameraPreview
            ref={previewRef}
            ev={state.lastEV}
            focalZoom={focalZoom}
            zoneSysEnabled={state.zoneSysEnabled}
            errorMessage={cameraError}
            onTap={handleTap}
          >
            <ZSysToggle
              enabled={state.zoneSysEnabled}
              onChange={(b) => {
                state.setZoneSysEnabled(b)
                if (!b) state.clearSpots()
              }}
            />
            {state.zoneSysEnabled && state.spotMarker && (
              <SpotMeter
                key={state.spotMarker.id}
                x={state.spotMarker.x}
                y={state.spotMarker.y}
                zone={spotDisplayZone}
                ev={state.spotMarker.evRaw + Math.log2(state.iso / 100)}
                selected={true}
                onSelect={() => {}}
              />
            )}
          </CameraPreview>
        </header>

        {/* Zone Section — ZS ON 시 카메라 아래 가로 스트립 */}
        {state.zoneSysEnabled && (
          <div className={styles.zoneSection}>
            <ZoneBar
              orientation="horizontal"
              currentZone={state.currentZone}
              selectedZone={state.selectedZone}
              onSelectZone={state.setSelectedZone}
            />
          </div>
        )}
      </div>

      {/* 우측 패널 — Variable Center + Fixed Bottom (와이드 레이아웃) */}
      <div className={styles.rightPanel}>
        {/* Variable Center */}
        <main className={styles.centerSection}>
          <ComboPairsList
            pairs={pairs}
            unmeasured={!state.liveResult}
            priorityF={state.priorityF}
            prioritySS={state.prioritySS}
            onChangePriority={(f, ss) => state.setPriority(f, ss)}
            presetCount={state.presets.length}
            onSaveClick={() => setPresetNaming(true)}
            onLoadClick={() => setPresetDrawerOpen((v) => !v)}
            theme={state.theme}
            onThemeChange={handleThemeChange}
          />
        </main>

        {/* Fixed Bottom */}
        <footer className={styles.bottomSection}>
          <MeasureButton
            onMeasure={handleMeasure}
            disabled={false}
            lastMeasuredAt={lastMeasuredAt}
            zoneSysActive={state.zoneSysEnabled && !state.spotMarker}
          />
          <div className={styles.dialStack}>
            <FocalDial
              value={state.focalLength35mm}
              onChange={state.setFocalLength35mm}
              device={state.device}
            />
            <div className={styles.dialDivider} />
            <ISODial value={state.iso} onChange={state.setISO} />
            <div className={styles.dialDivider} />
            <ECDial
              value={state.ec}
              onChange={state.setEC}
              disabled={state.zoneSysEnabled}
            />
          </div>
          <PresetPanel
            presets={state.presets}
            onSave={state.savePreset}
            onLoad={state.loadPreset}
            onDelete={state.deletePreset}
            drawerOpen={presetDrawerOpen}
            onDrawerClose={() => setPresetDrawerOpen(false)}
            naming={presetNaming}
            onNamingCancel={() => setPresetNaming(false)}
          />
        </footer>
      </div>
    </div>
  )
}

/**
 * evRaw 만으로 Zone 추정 — luminance 가 없을 때 사용.
 * Zone V (mid-gray) 는 ev100 ≈ 7.17 (CALIBRATION=100 기준).
 */
function classifyZoneFromEvRaw(evRaw: number): ZoneIndex {
  const luminance = 0.18 * Math.pow(2, evRaw - 7.17)
  return classifyZone(luminance)
}

export default function App() {
  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  )
}
