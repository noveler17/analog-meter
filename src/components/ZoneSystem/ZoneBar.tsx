// AnalogMeter — Zone Bar.
// Zone III ~ VII 를 무채색 그라데이션으로 우측에 표시 (PRD 2.1).
// 사용자가 segment 를 탭하면 selectedZone 으로 설정된다 — Zone System 워크플로우의 시작점.

import { ZONES, ZONE_GRADIENT_STEPS } from '../../tokens'
import { ZONE_ROMAN, type ZoneIndex } from '../../types'
import styles from './ZoneSystem.module.css'

interface ZoneBarProps {
  /** 라이브 측정 결과 Zone (자동 강조). */
  currentZone: ZoneIndex | null
  /** 사용자가 목표로 선택한 Zone (탭으로 설정/해제). */
  selectedZone: ZoneIndex | null
  /** Zone segment 탭 핸들러. 같은 Zone 두 번 탭 시 해제 의도로 null 호출. */
  onSelectZone: (z: ZoneIndex | null) => void
}

export function ZoneBar({
  currentZone,
  selectedZone,
  onSelectZone,
}: ZoneBarProps) {
  const segments: ZoneIndex[] = []
  for (let z = ZONES.BAR_MIN; z <= ZONES.BAR_MAX; z++) {
    segments.push(z as ZoneIndex)
  }

  return (
    <div className={styles.zoneBar} aria-label="Zone System indicator">
      {segments.map((z) => {
        const isCurrent = currentZone === z
        const isSelected = selectedZone === z
        const cls = [
          styles.zoneSegment,
          isCurrent ? styles.zoneSegmentActive : '',
          isSelected ? styles.zoneSegmentSelected : '',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <button
            key={z}
            type="button"
            className={cls}
            style={{ background: ZONE_GRADIENT_STEPS[z] }}
            title={`Zone ${ZONE_ROMAN[z]}`}
            aria-label={`Select Zone ${ZONE_ROMAN[z]}`}
            aria-pressed={isSelected}
            onClick={() => onSelectZone(isSelected ? null : z)}
          >
            <span className={styles.zoneLabel}>{ZONE_ROMAN[z]}</span>
          </button>
        )
      })}
    </div>
  )
}
