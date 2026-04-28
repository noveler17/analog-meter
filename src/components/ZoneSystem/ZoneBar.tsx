// AnalogMeter — Zone Bar.
// Zone III ~ VII 를 무채색 그라데이션으로 표시 (PRD 2.1).
// 사용자가 segment 를 탭하면 selectedZone 으로 설정된다 — Zone System 워크플로우의 시작점.
// orientation='horizontal' 은 카메라 아래 가로 스트립으로 배치된다.

import { ZONES, ZONE_GRADIENT_STEPS } from '../../tokens'
import { ZONE_ROMAN, type ZoneIndex } from '../../types'
import styles from './ZoneSystem.module.css'

interface ZoneBarProps {
  /** 라이브 측정 결과 Zone (자동 강조). */
  currentZone: ZoneIndex | null
  /** 사용자가 목표로 선택한 Zone. */
  selectedZone: ZoneIndex | null
  /** Zone segment 탭 핸들러. 다른 Zone 으로 전환만 가능 — 재탭 deselect 없음. */
  onSelectZone: (z: ZoneIndex) => void
  /** 'vertical' (카메라 우측 오버레이) | 'horizontal' (카메라 아래 가로 스트립). 기본 vertical. */
  orientation?: 'vertical' | 'horizontal'
}

export function ZoneBar({
  currentZone,
  selectedZone,
  onSelectZone,
  orientation = 'vertical',
}: ZoneBarProps) {
  const segments: ZoneIndex[] = []
  for (let z = ZONES.BAR_MIN; z <= ZONES.BAR_MAX; z++) {
    segments.push(z as ZoneIndex)
  }

  const containerCls =
    orientation === 'horizontal' ? styles.zoneBarHorizontal : styles.zoneBar

  return (
    <div
      className={containerCls}
      aria-label="Zone System indicator"
      onPointerUp={(e) => e.stopPropagation()}
    >
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
            onClick={(e) => {
              e.stopPropagation()
              if (!isSelected) onSelectZone(z)
            }}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <span className={styles.zoneLabel}>{ZONE_ROMAN[z]}</span>
          </button>
        )
      })}
    </div>
  )
}
