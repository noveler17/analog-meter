// AnalogMeter — Zone Bar.
// Zone III ~ VII 를 무채색 그라데이션으로 우측에 표시 (PRD 2.1).

import { ZONES, ZONE_GRADIENT_STEPS } from '../../tokens'
import { ZONE_ROMAN, type ZoneIndex } from '../../types'
import styles from './ZoneSystem.module.css'

interface ZoneBarProps {
  /** 현재 메인 측정 Zone. null 이면 강조 없음. */
  currentZone: ZoneIndex | null
}

export function ZoneBar({ currentZone }: ZoneBarProps) {
  const segments: ZoneIndex[] = []
  for (let z = ZONES.BAR_MIN; z <= ZONES.BAR_MAX; z++) {
    segments.push(z as ZoneIndex)
  }

  return (
    <div className={styles.zoneBar} aria-label="Zone System indicator">
      {segments.map((z) => {
        const active = currentZone === z
        return (
          <div
            key={z}
            className={`${styles.zoneSegment} ${active ? styles.zoneSegmentActive : ''}`}
            style={{ background: ZONE_GRADIENT_STEPS[z] }}
            title={`Zone ${ZONE_ROMAN[z]}`}
          >
            <span className={styles.zoneLabel}>{ZONE_ROMAN[z]}</span>
          </div>
        )
      })}
    </div>
  )
}
