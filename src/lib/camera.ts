// AnalogMeter — Camera & Worker bridge (main thread).
//
// 책임:
//   1. getUserMedia 로 후면 카메라 시작 → <video> 엘리먼트에 attach.
//   2. requestVideoFrameCallback (또는 rAF 폴백) 으로 매 프레임 createImageBitmap.
//   3. 비트맵을 Worker 로 transferable 로 전송.
//   4. Worker 결과(WorkerResult) 콜백.
//
// Worker 자체는 src/workers/luminance.worker.ts. 메인은 픽셀을 분석하지 않는다.

import { PERF } from '../tokens'
import type {
  EC,
  FRange,
  FocalZoom,
  ISO,
  SSRange,
  WorkerRequest,
  WorkerResult,
} from '../types'

// rVFC 가 있는 HTMLVideoElement 를 옵셔널 메소드로 좁힌다.
// (TS lib.dom 에 정의가 없으면 메소드는 undefined.)
type VideoElementWithRVFC = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number) => void) => number
  cancelVideoFrameCallback?: (handle: number) => void
}

// ---------------------------------------------------------------------------
// 공개 API
// ---------------------------------------------------------------------------

export interface StartCameraOptions {
  /** 라이브뷰를 표시할 video 엘리먼트. */
  video: HTMLVideoElement
  /** Worker로부터 메시지 수신 콜백. */
  onMessage: (msg: WorkerResult) => void
  /** 초기 ISO/EC/우선순위 (선택). */
  iso?: ISO
  ec?: EC
  focalZoom?: FocalZoom
  priorityF?: FRange | null
  prioritySS?: SSRange | null
  /** facingMode. 기본 'environment'. */
  facing?: 'environment' | 'user'
}

export interface CameraSession {
  /** Worker 로 메시지 전송. (frame 외 컨트롤 메시지) */
  send: (msg: WorkerRequest, transfer?: Transferable[]) => void
  /** 사용자가 화면을 탭했을 때 spot meter 요청. (0~1 정규화 좌표) */
  requestSpot: (nx: number, ny: number) => Promise<void>
  /** 카메라 + 워커 정리. */
  stop: () => void
}

/**
 * 카메라 프리뷰 + Worker 파이프라인 시작.
 *
 *   - getUserMedia 권한 거부 시 'error' WorkerResult 를 송신한 뒤 reject 한다.
 *   - rVFC 미지원 시 setInterval(WORKER_INTERVAL_MS) 폴백.
 */
export async function startCamera(options: StartCameraOptions): Promise<CameraSession> {
  const {
    video,
    onMessage,
    iso = 100,
    ec = 0,
    focalZoom = 1.0,
    priorityF = null,
    prioritySS = null,
    facing = 'environment',
  } = options

  // 1) Worker 생성. import.meta.url 패턴 → Vite 가 entry로 인식.
  const worker = new Worker(
    new URL('../workers/luminance.worker.ts', import.meta.url),
    { type: 'module' },
  )

  worker.onmessage = (e: MessageEvent<WorkerResult>) => onMessage(e.data)
  worker.onerror = (e) => {
    onMessage({
      type: 'error',
      error: e.message ?? 'worker runtime error',
      timestamp: performance.now(),
    })
  }

  const send = (msg: WorkerRequest, transfer: Transferable[] = []) => {
    if (transfer.length > 0) {
      worker.postMessage(msg, transfer)
    } else {
      worker.postMessage(msg)
    }
  }

  // 2) start 컨트롤 송신 (프레임은 별도).
  send({ type: 'start', iso, ec, focalZoom, priorityF, prioritySS })

  // 3) 카메라 권한.
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: facing,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'getUserMedia failed'
    onMessage({ type: 'error', error: msg, timestamp: performance.now() })
    worker.terminate()
    throw err
  }

  video.srcObject = stream
  video.muted = true
  video.playsInline = true
  await video.play().catch(() => {
    /* autoplay 일시 실패는 무시 — 첫 user gesture 후 재시도. */
  })

  // 4) 프레임 루프.
  const v = video as VideoElementWithRVFC
  let stopped = false
  let rvfcHandle: number | null = null
  let intervalHandle: number | null = null
  let lastPostedAt = 0

  const pumpFrame = async () => {
    if (stopped) return
    if (video.readyState < 2 /* HAVE_CURRENT_DATA */) return
    const now = performance.now()
    if (now - lastPostedAt < PERF.WORKER_INTERVAL_MS) return
    lastPostedAt = now
    try {
      // createImageBitmap 은 transferable 한 결과를 반환.
      const bitmap = await createImageBitmap(video)
      const req: WorkerRequest = { type: 'frame', frame: bitmap }
      worker.postMessage(req, [bitmap])
    } catch {
      // 일시적 GPU 오류 — 다음 프레임에서 재시도.
    }
  }

  if (typeof v.requestVideoFrameCallback === 'function') {
    const tick = () => {
      if (stopped) return
      void pumpFrame()
      rvfcHandle = v.requestVideoFrameCallback!(tick)
    }
    rvfcHandle = v.requestVideoFrameCallback(tick)
  } else {
    intervalHandle = window.setInterval(() => {
      void pumpFrame()
    }, PERF.WORKER_INTERVAL_MS)
  }

  // 5) Spot meter 요청 — 메인 스레드가 별도 비트맵 캡처 후 송신.
  const requestSpot = async (nx: number, ny: number) => {
    if (stopped) return
    try {
      const bitmap = await createImageBitmap(video)
      const req: WorkerRequest = {
        type: 'sample-spot',
        frame: bitmap,
        spotX: nx,
        spotY: ny,
      }
      worker.postMessage(req, [bitmap])
    } catch (err) {
      onMessage({
        type: 'error',
        error:
          err instanceof Error ? err.message : 'spot capture failed',
        timestamp: performance.now(),
      })
    }
  }

  const stop = () => {
    if (stopped) return
    stopped = true
    if (rvfcHandle !== null && typeof v.cancelVideoFrameCallback === 'function') {
      v.cancelVideoFrameCallback(rvfcHandle)
    }
    if (intervalHandle !== null) {
      clearInterval(intervalHandle)
    }
    worker.postMessage({ type: 'stop' } satisfies WorkerRequest)
    worker.terminate()
    stream.getTracks().forEach((t) => t.stop())
    if (video.srcObject) {
      video.srcObject = null
    }
  }

  return { send, requestSpot, stop }
}
