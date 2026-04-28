// AnalogMeter — Combination Pairs 리스트.
// 헤더: [COMBINATIONS count] [SAVE] [LOAD(N)] [SETTINGS]
// 하이라이트: matchF → 조리개 span, matchSS → 셔터 span 개별 강조.

import { useMemo, useState } from 'react'
import type { ComboPairHighlighted, FRange, Preset, SSRange } from '../../types'
import { sortByPriority } from '../../lib/exposure-engine'
import { SettingsModal } from './SettingsModal'
import type { Theme } from '../../state/appState'
import styles from './ComboPairs.module.css'

interface ComboPairsListProps {
  pairs: ComboPairHighlighted[]
  /** 아직 Measure를 누르지 않은 상태. */
  unmeasured?: boolean
  priorityF: FRange | null
  prioritySS: SSRange | null
  onChangePriority: (f: FRange | null, ss: SSRange | null) => void
  presetCount: number
  onSaveClick: () => void
  onLoadClick: () => void
  theme: Theme
  onThemeChange: (t: Theme) => void
  presets?: Preset[]
}

export function ComboPairsList({
  pairs,
  unmeasured,
  priorityF,
  prioritySS,
  onChangePriority,
  presetCount,
  onSaveClick,
  onLoadClick,
  theme,
  onThemeChange,
}: ComboPairsListProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const sortedPairs = useMemo(() => sortByPriority(pairs), [pairs])

  return (
    <section className={styles.comboSection} aria-label="Aperture and shutter combinations">
      <header className={styles.header}>
        <span className={styles.headerTitle}>COMBINATIONS</span>
        <span className={styles.headerCount}>{sortedPairs.length}</span>
        {/* SAVE / LOAD 버튼 — Settings 버튼 왼쪽 */}
        <button
          type="button"
          className={styles.headerBtn}
          onClick={onSaveClick}
          aria-label="Save current settings as preset"
        >
          SAVE
        </button>
        <button
          type="button"
          className={styles.headerBtn}
          onClick={onLoadClick}
          aria-label="Load presets"
        >
          LOAD{presetCount > 0 ? ` (${presetCount})` : ''}
        </button>
        <button
          type="button"
          className={styles.settingsBtn}
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
        >
          SETTINGS
        </button>
      </header>

      {unmeasured ? (
        <div className={styles.emptyState}>TAP MEASURE TO START</div>
      ) : sortedPairs.length === 0 ? (
        <div className={styles.emptyState}>—</div>
      ) : (
        <ul className={styles.pairList}>
          {sortedPairs.map((p, idx) => (
            <li
              key={`${p.aperture}-${p.shutterSpeed}-${idx}`}
              className={`${styles.pairRow} ${p.matchF && p.matchSS ? styles.pairBothRow : ''}`}
            >
              <span
                className={`${styles.pairAperture} ${p.matchF ? styles.matchHighlight : ''}`}
              >
                {p.apertureLabel}
              </span>
              <span className={styles.pairDot}>·</span>
              <span
                className={`${styles.pairShutter} ${p.matchSS ? styles.matchHighlight : ''}`}
              >
                {p.shutterLabel}
              </span>
            </li>
          ))}
        </ul>
      )}

      {settingsOpen && (
        <SettingsModal
          priorityF={priorityF}
          prioritySS={prioritySS}
          theme={theme}
          onApply={(f, ss) => {
            onChangePriority(f, ss)
            setSettingsOpen(false)
          }}
          onThemeChange={onThemeChange}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </section>
  )
}
