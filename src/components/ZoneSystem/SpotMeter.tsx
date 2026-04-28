// AnalogMeter — Spot Meter 마커.
// 사용자가 화면 탭 시 생성되는 원형 인디케이터. Zone 색상으로 매핑.
// 마커 자체를 다시 탭하면 보정 기준 spot 으로 선택된다.

import { ZONE_GRADIENT_STEPS } from '../../tokens'
import type { ZoneIndex } from '../../types'
import { ZONE_ROMAN } from '../../types'
import styles from './ZoneSystem.module.css'

interface SpotMeterProps {
  /** 0~1 정규화 X 좌표. */
  x: number
  /** 0~1 정규화 Y 좌표. */
  y: number
  zone: ZoneIndex
  ev: number
  /** 보정 기준으로 선택된 spot 인지 여부. */
  selected?: boolean
  /** 사용자 탭 콜백. */
  onSelect?: () => void
}

export function SpotMeter({ x, y, zone, ev, selected, onSelect }: SpotMeterProps) {
  const tone = ZONE_GRADIENT_STEPS[zone]
  const cls = `${styles.spotMarker} ${selected ? styles.spotMarkerSelected : ''}`
  return (
    <button
      type="button"
      className={cls}
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        borderColor: tone,
      }}
      aria-label={`Spot reading Zone ${ZONE_ROMAN[zone]}`}
      aria-pressed={!!selected}
      onClick={(e) => {
        // 프리뷰 컨테이너의 onPointerUp 으로 새 spot 이 또 잡히지 않도록 차단.
        e.stopPropagation()
        onSelect?.()
      }}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <span className={styles.spotZone} style={{ color: tone }}>
        {ZONE_ROMAN[zone]}
      </span>
      <span className={styles.spotEV}>{ev.toFixed(1)}</span>
    </button>
  )
}
