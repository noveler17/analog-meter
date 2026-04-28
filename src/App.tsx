// AnalogMeter — App shell.
// Fixed Top (카메라) / Zone Section (옵션) / Variable Center (콤보) / Fixed Bottom (다이얼) 레이아웃.
// 측정은 스냅샷 모델 — 첫 프레임 1회 + Measure 버튼으로만 트리거.

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
import { GitHubLink } from './components/GitHubLink/GitHubLink'
import { AppStateProvider, useAppState } from './state/appState'
import { startCamera, type CameraSession } from './lib/camera'
import { focalLengthToZoom } from './lib/devices'
import {
  applyHighlight,
  classifyZone,
  generateCombos,
  sortByPriority,
} from './lib/exposure-engine'
import type { EVResult, ZoneIndex } from './types'

import styles from './App.module.css'

/**
 * 마지막 측정의 raw 휘도(evRaw)에 ISO/EC/우선순위를 다시 적용해 EVResult 를 만든다.
 * 카메라를 새로 캡처하지 않고 표시 노출만 갱신한다.
 */
function recomputeFromSnapshot(
  base: EVResult,
  iso: number,
  ec: number,
  priorityF: EVResult['priorityF'],
  prioritySS: EVResult['prioritySS'],
): EVResult {
  const ev = base.evRaw + Math.log2(iso / 100) - ec
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
  const previewRef = useRef<CameraPreviewHandle | null>(null)
  const sessionRef = useRef<CameraSession | null>(null)
  const [pairs, setPairs] = useState<EVResult['pairs']>([])
  const [cameraError, setCameraError] = useState<string | null>(null)

  // 다이얼은 mm 단위지만 카메라 트랙은 zoom 배율을 받는다 — 어댑터.
  const focalZoom = useMemo(
    () => focalLengthToZoom(state.focalLength35mm, state.device),
    [state.focalLength35mm, state.device],
  )

  // ZS 모드일 때 EV 재합성에 사용할 EC (= 0). main thread 가 다이얼 EC 를 무시하도록.
  const effectiveEC = state.zoneSysEnabled ? 0 : state.ec

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
                iso: msg.iso ?? state.iso,
                ec: msg.ec ?? state.ec,
                pairs: msg.pairs ?? [],
                priorityF: msg.priorityF ?? null,
                prioritySS: msg.prioritySS ?? null,
                measuredAt: msg.measuredAt ?? Date.now(),
              }
              const zone = (msg.zone ?? 5) as ZoneIndex
              state.applyLive(result, zone)
              state.pushMeasure(result)
              setPairs(result.pairs)
              return
            }
            if (msg.type === 'spot-result' && msg.spot) {
              state.addSpot({
                id: `spot-${msg.timestamp}`,
                x: msg.spot.x,
                y: msg.spot.y,
                ev: msg.spot.ev,
                evRaw: msg.spot.evRaw,
              })
            }
          },
        })
        if (cancelled) {
          session.stop()
          return
        }
        sessionRef.current = session

        // 첫 프레임 도달 시점에 자동으로 1회 측정 — 사용자가 버튼을 누르기 전에도 화면 채움.
        const triggerInitial = () => {
          if (cancelled) return
          void session.requestMeasure()
        }
        if (video.readyState >= 2) {
          triggerInitial()
        } else {
          video.addEventListener('loadeddata', triggerInitial, { once: true })
        }
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

  // ---- ISO/EC/Priority/ZS 변경 시 마지막 스냅샷에서 EV/pairs 재합성 ----
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
    )
    // base 와 동일한 결과면 dispatch 생략.
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
  }, [state.iso, effectiveEC, state.priorityF, state.prioritySS, state.zoneSysEnabled])

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
  // ZS ON: 마지막 evRaw + selectedZone 으로 main thread 에서 보정만 재적용 (카메라 캡처 X).
  const handleMeasure = useCallback(() => {
    const session = sessionRef.current
    if (!session) return

    if (!state.zoneSysEnabled) {
      void session.requestMeasure()
      return
    }

    // ZS ON
    const base = state.liveResult
    if (!base) return
    const selectedZone = state.selectedZone ?? state.lastSelectedZone
    const spot = state.spotMarkers.find((m) => m.id === state.selectedSpotId)
    const baseEvRaw = spot ? spot.evRaw : base.evRaw
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

  // SpotMarker 표시 zone 은 사용자가 선택한 Zone 을 그대로 따라간다.
  const spotDisplayZone: ZoneIndex =
    state.selectedZone ?? state.lastSelectedZone

  return (
    <div className={styles.app}>
      {/* Fixed Top — 카메라 only */}
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
          {state.zoneSysEnabled &&
            state.spotMarkers.map((m) => (
              <SpotMeter
                key={m.id}
                x={m.x}
                y={m.y}
                zone={spotDisplayZone}
                ev={m.evRaw + Math.log2(state.iso / 100)}
                selected={m.id === state.selectedSpotId}
                onSelect={() => state.setSelectedSpot(m.id)}
              />
            ))}
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
          disabled={false}
          lastMeasuredAt={lastMeasuredAt}
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
        />
      </footer>

      <GitHubLink />
    </div>
  )
}

/**
 * evRaw 만으로 Zone 추정 — luminance 가 없을 때 사용.
 * Zone V (mid-gray) 는 ev100 ≈ 7.17 (CALIBRATION=100 기준).
 */
function classifyZoneFromEvRaw(evRaw: number): ZoneIndex {
  // 역산: luminance = 0.18 * 2^(evRaw - log2(0.18 * 100 * 100 / 12.5))
  // → luminance ≈ 0.18 * 2^(evRaw - 7.17)
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
