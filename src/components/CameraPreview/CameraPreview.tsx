// AnalogMeter — Live camera preview + 가이드 박스 + 실시간 EV 텍스트.
// 카메라 스트림은 src/lib/camera.ts (App.tsx 가 startCamera 호출 후 video ref 를 attach).

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  type PointerEvent,
} from 'react'
import type { EV, FocalZoom } from '../../types'
import { FOCAL_ZOOM_MAX, FOCAL_ZOOM_MIN } from '../../tokens'
import styles from './CameraPreview.module.css'

interface CameraPreviewProps {
  ev: EV | null
  focalZoom: FocalZoom
  /** Z-SYS 모드일 때 가이드 박스 색상이 변한다. */
  zoneSysEnabled: boolean
  /** 권한 거부 / 카메라 오류 시 표시할 문구. */
  errorMessage?: string | null
  /** 사용자가 프리뷰 영역을 탭했을 때 — source frame 기준 0~1 정규화 좌표 콜백. */
  onTap?: (nx: number, ny: number) => void
  /** Spot Marker 등 자식 오버레이. */
  children?: React.ReactNode
}

export interface CameraPreviewHandle {
  /** App.tsx 에서 startCamera({ video }) 에 넘길 video 엘리먼트. */
  getVideoElement: () => HTMLVideoElement | null
  /** source frame 좌표(0~1)를 컨테이너 표시 좌표(0~1)로 변환한다 (object-fit:cover 크롭 보정). */
  sourceToContainer: (nx: number, ny: number) => { x: number; y: number }
}

export const CameraPreview = forwardRef<CameraPreviewHandle, CameraPreviewProps>(
  function CameraPreview(
    { ev, focalZoom, zoneSysEnabled, errorMessage, onTap, children },
    ref,
  ) {
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const videoDimsRef = useRef<{ w: number; h: number } | null>(null)

    const getCoverTransform = useCallback(() => {
      const container = containerRef.current
      const dims = videoDimsRef.current
      if (!container || !dims) return null
      const rect = container.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return null
      const cAspect = rect.width / rect.height
      const vAspect = dims.w / dims.h
      return { cAspect, vAspect }
    }, [])

    useImperativeHandle(
      ref,
      () => ({
        getVideoElement: () => videoRef.current,
        sourceToContainer: (nx: number, ny: number) => {
          const t = getCoverTransform()
          if (!t) return { x: nx, y: ny }
          const { cAspect, vAspect } = t
          if (vAspect > cAspect) {
            // 좌우 크롭 — x 축 역변환
            const visW = cAspect / vAspect
            return { x: 0.5 + (nx - 0.5) / visW, y: ny }
          } else {
            // 상하 크롭 — y 축 역변환
            const visH = vAspect / cAspect
            return { x: nx, y: 0.5 + (ny - 0.5) / visH }
          }
        },
      }),
      [getCoverTransform],
    )

    const handleLoadedMetadata = useCallback(() => {
      const v = videoRef.current
      if (!v || !v.videoWidth || !v.videoHeight) return
      videoDimsRef.current = { w: v.videoWidth, h: v.videoHeight }
    }, [])

    const handlePointerUp = useCallback(
      (e: PointerEvent<HTMLDivElement>) => {
        if (!onTap) return
        const el = containerRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return
        const nxC = (e.clientX - rect.left) / rect.width
        const nyC = (e.clientY - rect.top) / rect.height
        if (nxC < 0 || nxC > 1 || nyC < 0 || nyC > 1) return

        // object-fit:cover 크롭을 고려해 container coords → source frame coords 변환
        const t = getCoverTransform()
        if (!t) {
          onTap(nxC, nyC)
          return
        }
        const { cAspect, vAspect } = t
        let nxS: number, nyS: number
        if (vAspect > cAspect) {
          const visW = cAspect / vAspect
          nxS = Math.max(0, Math.min(1, 0.5 + (nxC - 0.5) * visW))
          nyS = nyC
        } else {
          const visH = vAspect / cAspect
          nxS = nxC
          nyS = Math.max(0, Math.min(1, 0.5 + (nyC - 0.5) * visH))
        }
        onTap(nxS, nyS)
      },
      [onTap, getCoverTransform],
    )

    // 가이드 박스 크기: 1x → 100%, 5x → 20%. 클램프.
    const clampedZoom = Math.max(
      FOCAL_ZOOM_MIN,
      Math.min(FOCAL_ZOOM_MAX, focalZoom || 1.0),
    )
    const boxPct = `${100 / clampedZoom}%`

    return (
      <div
        ref={containerRef}
        className={styles.preview}
        onPointerUp={handlePointerUp}
      >
        <video
          ref={videoRef}
          className={styles.video}
          playsInline
          muted
          autoPlay
          onLoadedMetadata={handleLoadedMetadata}
        />
        {/* 가이드 박스 */}
        <div
          className={`${styles.guideBox} ${zoneSysEnabled ? styles.guideBoxZSys : ''}`}
          style={{ width: boxPct, height: boxPct }}
          aria-hidden="true"
        >
          <span className={styles.evLabel}>
            EV {ev !== null && Number.isFinite(ev) ? ev.toFixed(1) : '—'}
          </span>
        </div>
        {/* 자식 오버레이 (Spot markers, Zone bar 등) */}
        {children}
        {errorMessage && (
          <div className={styles.errorOverlay} role="alert">
            <strong>Camera unavailable</strong>
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    )
  },
)
