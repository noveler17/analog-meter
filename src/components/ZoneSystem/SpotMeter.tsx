// AnalogMeter — Spot Meter 마커.
// 사용자가 화면 탭 시 생성되는 원형 인디케이터. Zone 색상으로 매핑.

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
}

export function SpotMeter({ x, y, zone, ev }: SpotMeterProps) {
  const tone = ZONE_GRADIENT_STEPS[zone]
  return (
    <div
      className={styles.spotMarker}
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        borderColor: tone,
      }}
      aria-label={`Spot reading Zone ${ZONE_ROMAN[zone]}`}
    >
      <span className={styles.spotZone} style={{ color: tone }}>
        {ZONE_ROMAN[zone]}
      </span>
      <span className={styles.spotEV}>{ev.toFixed(1)}</span>
    </div>
  )
}
