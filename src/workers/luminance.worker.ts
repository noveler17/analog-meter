// AnalogMeter — Luminance Web Worker.
// 메인 스레드는 카메라 비디오 → ImageBitmap 으로만 송신한다.
// 본 워커가 OffscreenCanvas 위에 그려 픽셀 분석 → EV/Zone/ComboPair 계산 → 메인 회신.
//
// 계약: WorkerRequest/WorkerResult (src/types.ts)
// 토큰: PERF.WORKER_INTERVAL_MS (송신 주기 throttle)

/// <reference lib="WebWorker" />

import {
  applyHighlight,
  averageLuminance,
  classifyZone,
  classifyZoneByEV,
  generateCombos,
  luminanceToEV,
  luminanceToEV100,
  sortByPriority,
  spotLuminance,
} from '../lib/exposure-engine'
import type {
  EC,
  EV,
  FRange,
  FocalZoom,
  ISO,
  SSRange,
  WorkerRequest,
  WorkerResult,
} from '../types'

// `self` 를 DedicatedWorkerGlobalScope 로 단언.
const ctx = self as unknown as DedicatedWorkerGlobalScope

// ---------------------------------------------------------------------------
// 워커 상태
// ---------------------------------------------------------------------------

let running = false
let iso: ISO = 100
let ec: EC = 0
// focalZoom 은 현재 EV 계산엔 영향 없음 — UI 가이드 박스 / 렌즈 선택과 연동되는 메타.
// eslint 가 unused 경고를 내지 않도록 echo 용으로 보관.
let focalZoom: FocalZoom = 1.0
let priorityF: FRange | null = null
let prioritySS: SSRange | null = null

let canvas: OffscreenCanvas | null = null
let canvasCtx: OffscreenCanvasRenderingContext2D | null = null

// ---------------------------------------------------------------------------
// 메시지 라우팅
// ---------------------------------------------------------------------------

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data
  try {
    switch (msg.type) {
      case 'start':
        if (typeof msg.iso === 'number') iso = msg.iso
        if (typeof msg.ec === 'number') ec = msg.ec
        if (typeof msg.focalZoom === 'number') focalZoom = msg.focalZoom
        if (msg.priorityF !== undefined) priorityF = msg.priorityF
        if (msg.prioritySS !== undefined) prioritySS = msg.prioritySS
        running = true
        emitReady()
        break

      case 'stop':
        running = false
        break

      case 'set-iso':
        if (typeof msg.iso === 'number') iso = msg.iso
        break

      case 'set-ec':
        if (typeof msg.ec === 'number') ec = msg.ec
        break

      case 'set-focal':
        if (typeof msg.focalZoom === 'number') focalZoom = msg.focalZoom
        break

      case 'set-priority':
        if (msg.priorityF !== undefined) priorityF = msg.priorityF
        if (msg.prioritySS !== undefined) prioritySS = msg.prioritySS
        break

      case 'frame':
        if (msg.frame) handleFrame(msg.frame)
        break

      case 'sample-spot':
        if (
          msg.frame &&
          typeof msg.spotX === 'number' &&
          typeof msg.spotY === 'number'
        ) {
          handleSpot(msg.frame, msg.spotX, msg.spotY)
        }
        break

      default: {
        const exhaustive: never = msg.type as never
        void exhaustive
      }
    }
  } catch (err) {
    emitError(err)
  }
}

// ---------------------------------------------------------------------------
// 프레임 처리
// ---------------------------------------------------------------------------

function ensureCanvas(width: number, height: number): boolean {
  if (typeof OffscreenCanvas === 'undefined') {
    emitError('OffscreenCanvas not supported in this Worker context')
    return false
  }
  if (!canvas || canvas.width !== width || canvas.height !== height) {
    canvas = new OffscreenCanvas(width, height)
    canvasCtx = canvas.getContext('2d', { willReadFrequently: true })
    if (!canvasCtx) {
      emitError('OffscreenCanvas 2d context unavailable')
      return false
    }
  }
  return true
}

function handleFrame(bitmap: ImageBitmap): void {
  const { width, height } = bitmap
  if (!ensureCanvas(width, height) || !canvasCtx || !canvas) {
    bitmap.close()
    return
  }

  // 메인 스레드에서 transfer 받은 비트맵을 OffscreenCanvas에 즉시 그린다.
  canvasCtx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  if (!running) return

  // 스냅샷 모델: 메인 스레드가 명시적으로 frame 을 보낼 때마다 1회 계산 + 송신.
  const now = performance.now()
  const imageData = canvasCtx.getImageData(0, 0, width, height)
  const luminance = averageLuminance(imageData.data)
  const evRaw: EV = luminanceToEV100(luminance)
  const ev: EV = luminanceToEV(luminance, iso, ec)
  const zone = classifyZone(luminance)

  const pairs = sortByPriority(
    applyHighlight(generateCombos(ev), priorityF, prioritySS),
  )

  const result: WorkerResult = {
    type: 'ev-update',
    ev,
    evRaw,
    zone,
    luminance,
    timestamp: now,
    pairs,
    iso,
    ec,
    priorityF,
    prioritySS,
    measuredAt: Date.now(),
  }
  ctx.postMessage(result)
}

function handleSpot(bitmap: ImageBitmap, nx: number, ny: number): void {
  const { width, height } = bitmap
  if (!ensureCanvas(width, height) || !canvasCtx) {
    bitmap.close()
    return
  }

  canvasCtx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const imageData = canvasCtx.getImageData(0, 0, width, height)
  const spotLum = spotLuminance(imageData.data, width, height, nx, ny)
  const meanLum = averageLuminance(imageData.data)

  const spotEvRaw = luminanceToEV100(spotLum)
  const spotEV = luminanceToEV(spotLum, iso, ec)
  const meanEV = luminanceToEV(meanLum, iso, ec)
  const zone = classifyZoneByEV(spotEV, meanEV)

  const result: WorkerResult = {
    type: 'spot-result',
    timestamp: performance.now(),
    spot: {
      zone,
      ev: spotEV,
      evRaw: spotEvRaw,
      x: nx,
      y: ny,
    },
  }
  ctx.postMessage(result)
}

// ---------------------------------------------------------------------------
// 송신 헬퍼
// ---------------------------------------------------------------------------

function emitReady(): void {
  const msg: WorkerResult = {
    type: 'ready',
    timestamp: performance.now(),
  }
  ctx.postMessage(msg)
}

function emitError(err: unknown): void {
  const message =
    err instanceof Error ? err.message : typeof err === 'string' ? err : 'unknown worker error'
  const msg: WorkerResult = {
    type: 'error',
    error: message,
    timestamp: performance.now(),
  }
  ctx.postMessage(msg)
}

// focalZoom 은 현재 계산식엔 미사용 — TS noUnusedLocals 회피용 export.
export const __focalZoomEcho = (): FocalZoom => focalZoom
