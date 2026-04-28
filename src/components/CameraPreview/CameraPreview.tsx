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
  /** 사용자가 프리뷰 영역을 탭했을 때 — 0~1 정규화 좌표 콜백. */
  onTap?: (nx: number, ny: number) => void
  /** Spot Marker 등 자식 오버레이. */
  children?: React.ReactNode
}

export interface CameraPreviewHandle {
  /** App.tsx 에서 startCamera({ video }) 에 넘길 video 엘리먼트. */
  getVideoElement: () => HTMLVideoElement | null
}

export const CameraPreview = forwardRef<CameraPreviewHandle, CameraPreviewProps>(
  function CameraPreview(
    { ev, focalZoom, zoneSysEnabled, errorMessage, onTap, children },
    ref,
  ) {
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)

    useImperativeHandle(
      ref,
      () => ({
        getVideoElement: () => videoRef.current,
      }),
      [],
    )

    const handlePointerUp = useCallback(
      (e: PointerEvent<HTMLDivElement>) => {
        if (!onTap) return
        const el = containerRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return
        const nx = (e.clientX - rect.left) / rect.width
        const ny = (e.clientY - rect.top) / rect.height
        if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return
        onTap(nx, ny)
      },
      [onTap],
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
