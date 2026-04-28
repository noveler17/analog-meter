// AnalogMeter — App shell.
// Fixed Top / Variable Center / Fixed Bottom 3-구역 레이아웃을 구성하고
// startCamera (lib/camera.ts) 로 Worker 파이프라인을 연결한다.

import { useCallback, useEffect, useRef, useState } from 'react'
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
import { GitHubLink } from './components/GitHubLink/GitHubLink'
import { AppStateProvider, useAppState } from './state/appState'
import { startCamera, type CameraSession } from './lib/camera'
import type { EVResult, ZoneIndex } from './types'

import styles from './App.module.css'

function AppShell() {
  const state = useAppState()
  const previewRef = useRef<CameraPreviewHandle | null>(null)
  const sessionRef = useRef<CameraSession | null>(null)
  const [pairs, setPairs] = useState<EVResult['pairs']>([])
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [, setLastTick] = useState(0) // 60fps re-render trigger (값 자체는 미사용)

  // ---- 카메라 + Worker 부팅 (마운트 1회) ----
  useEffect(() => {
    let cancelled = false
    const video = previewRef.current?.getVideoElement()
    if (!video) return

    ;(async () => {
      try {
        const session = await startCamera({
          video,
          iso: state.iso,
          ec: state.ec,
          focalZoom: state.focalZoom,
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
              // Worker 가 EVResult 와 1:1 매핑된 페이로드를 보낸다.
              const result: EVResult = {
                ev: msg.ev ?? 0,
                evRaw: msg.evRaw ?? 0,
                iso: msg.iso ?? state.iso,
                ec: msg.ec ?? state.ec,
                pairs: msg.pairs ?? [],
                priorityF: msg.priorityF ?? null,
                prioritySS: msg.prioritySS ?? null,
                measuredAt: msg.measuredAt ?? Date.now(),
              }
              const zone = (msg.zone ?? 5) as ZoneIndex
              state.applyLive(result, zone)
              setPairs(result.pairs)
              setLastTick(msg.timestamp)
              return
            }
            if (msg.type === 'spot-result' && msg.spot) {
              state.addSpot({
                id: `spot-${msg.timestamp}`,
                x: msg.spot.x,
                y: msg.spot.y,
                zone: msg.spot.zone,
                ev: msg.spot.ev,
              })
            }
          },
        })
        if (cancelled) {
          session.stop()
          return
        }
        sessionRef.current = session
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

  // ---- 다이얼 변경 → Worker 동기화 ----
  useEffect(() => {
    sessionRef.current?.send({ type: 'set-iso', iso: state.iso })
  }, [state.iso])

  useEffect(() => {
    sessionRef.current?.send({ type: 'set-ec', ec: state.ec })
  }, [state.ec])

  useEffect(() => {
    sessionRef.current?.send({ type: 'set-focal', focalZoom: state.focalZoom })
  }, [state.focalZoom])

  useEffect(() => {
    sessionRef.current?.send({
      type: 'set-priority',
      priorityF: state.priorityF,
      prioritySS: state.prioritySS,
    })
  }, [state.priorityF, state.prioritySS])

  // ---- Spot Meter 트리거 ----
  const handleTap = useCallback(
    (nx: number, ny: number) => {
      if (!state.zoneSysEnabled) return
      void sessionRef.current?.requestSpot(nx, ny)
    },
    [state.zoneSysEnabled],
  )

  // ---- MEASURE 버튼 ----
  const handleMeasure = useCallback(() => {
    if (state.liveResult) {
      state.pushMeasure(state.liveResult)
    }
  }, [state])

  const lastMeasuredAt =
    state.measureLog.length > 0
      ? state.measureLog[state.measureLog.length - 1].measuredAt
      : null

  return (
    <div className={styles.app}>
      {/* Fixed Top */}
      <header className={styles.topSection}>
        <CameraPreview
          ref={previewRef}
          ev={state.lastEV}
          focalZoom={state.focalZoom}
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
          {state.zoneSysEnabled && <ZoneBar currentZone={state.currentZone} />}
          {state.zoneSysEnabled &&
            state.spotMarkers.map((m) => (
              <SpotMeter key={m.id} x={m.x} y={m.y} zone={m.zone} ev={m.ev} />
            ))}
        </CameraPreview>
      </header>

      {/* Variable Center */}
      <main className={styles.centerSection}>
        <ComboPairsList
          pairs={pairs}
          priorityF={state.priorityF}
          prioritySS={state.prioritySS}
          onChangePriority={(f, ss) => state.setPriority(f, ss)}
        />
      </main>

      {/* Fixed Bottom */}
      <footer className={styles.bottomSection}>
        <MeasureButton
          onMeasure={handleMeasure}
          disabled={state.liveResult === null}
          lastMeasuredAt={lastMeasuredAt}
        />
        <div className={styles.dialStack}>
          <FocalDial
            value={state.focalZoom}
            onChange={state.setFocalZoom}
            device={state.device}
          />
          <div className={styles.dialDivider} />
          <ISODial value={state.iso} onChange={state.setISO} />
          <div className={styles.dialDivider} />
          <ECDial value={state.ec} onChange={state.setEC} />
        </div>
        <PresetPanel
          presets={state.presets}
          onSave={state.savePreset}
          onLoad={state.loadPreset}
          onDelete={state.deletePreset}
        />
      </footer>

      <GitHubLink />
    </div>
  )
}

export default function App() {
  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  )
}
