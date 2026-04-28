// AnalogMeter — Combination Pairs 리스트.
// Worker 가 이미 priority 하이라이트를 적용한 ComboPairHighlighted[] 를 그대로 렌더링한다.
// PRD 2.2: matchF XOR matchSS → 글씨 초록 / matchF && matchSS → 테두리 초록.

import { useState } from 'react'
import type { ComboPairHighlighted, FRange, SSRange } from '../../types'
import { PrioritySettingsModal } from './PrioritySettingsModal'
import styles from './ComboPairs.module.css'

interface ComboPairsListProps {
  pairs: ComboPairHighlighted[]
  priorityF: FRange | null
  prioritySS: SSRange | null
  onChangePriority: (f: FRange | null, ss: SSRange | null) => void
}

function pairStyleClass(p: ComboPairHighlighted): string {
  if (p.matchF && p.matchSS) return styles.pairBoth
  if (p.matchF || p.matchSS) return styles.pairOne
  return ''
}

export function ComboPairsList({
  pairs,
  priorityF,
  prioritySS,
  onChangePriority,
}: ComboPairsListProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <section className={styles.comboSection} aria-label="Aperture and shutter combinations">
      <header className={styles.header}>
        <span className={styles.headerTitle}>COMBINATIONS</span>
        <span className={styles.headerCount}>{pairs.length}</span>
        <button
          type="button"
          className={styles.settingsBtn}
          onClick={() => setSettingsOpen(true)}
          aria-label="Configure priority ranges"
        >
          PRIORITY
        </button>
      </header>

      {pairs.length === 0 ? (
        <div className={styles.emptyState}>—</div>
      ) : (
        <ul className={styles.pairList}>
          {pairs.map((p, idx) => (
            <li
              key={`${p.aperture}-${p.shutterSpeed}-${idx}`}
              className={`${styles.pairRow} ${pairStyleClass(p)}`}
            >
              <span className={styles.pairAperture}>{p.apertureLabel}</span>
              <span className={styles.pairDot}>·</span>
              <span className={styles.pairShutter}>{p.shutterLabel}</span>
            </li>
          ))}
        </ul>
      )}

      {settingsOpen && (
        <PrioritySettingsModal
          priorityF={priorityF}
          prioritySS={prioritySS}
          onApply={(f, ss) => {
            onChangePriority(f, ss)
            setSettingsOpen(false)
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </section>
  )
}
