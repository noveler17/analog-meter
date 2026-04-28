// AnalogMeter — Preset 패널.
// SAVE PRESET / LOAD PRESETS 버튼 + 슬롯 표시. localStorage 기반.

import { useState } from 'react'
import type { Preset } from '../../types'
import styles from './PresetPanel.module.css'

interface PresetPanelProps {
  presets: Preset[]
  onSave: (name: string) => void
  onLoad: (id: string) => void
  onDelete: (id: string) => void
}

export function PresetPanel({
  presets,
  onSave,
  onLoad,
  onDelete,
}: PresetPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [naming, setNaming] = useState(false)
  const [draftName, setDraftName] = useState('')

  const beginSave = () => {
    setNaming(true)
    setDraftName(`Preset ${presets.length + 1}`)
  }

  const confirmSave = () => {
    onSave(draftName.trim() || `Preset ${presets.length + 1}`)
    setNaming(false)
    setDraftName('')
  }

  return (
    <section className={styles.presetPanel} aria-label="Presets">
      <div className={styles.row}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={beginSave}
          aria-label="Save current settings as preset"
        >
          SAVE
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => setDrawerOpen((v) => !v)}
          aria-expanded={drawerOpen}
          aria-label="Toggle preset list"
        >
          LOAD ({presets.length})
        </button>
      </div>

      {naming && (
        <div className={styles.namingRow}>
          <input
            className={styles.nameInput}
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Preset name"
            maxLength={32}
            autoFocus
          />
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            onClick={confirmSave}
          >
            OK
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => setNaming(false)}
          >
            ✕
          </button>
        </div>
      )}

      {drawerOpen && (
        <ul className={styles.slotList}>
          {presets.length === 0 ? (
            <li className={styles.slotEmpty}>No presets saved.</li>
          ) : (
            presets
              .slice()
              .sort((a, b) => b.savedAt - a.savedAt)
              .map((p) => (
                <li key={p.id} className={styles.slot}>
                  <button
                    type="button"
                    className={styles.slotLoad}
                    onClick={() => {
                      onLoad(p.id)
                      setDrawerOpen(false)
                    }}
                  >
                    <span className={styles.slotName}>{p.name}</span>
                    <span className={styles.slotMeta}>
                      ISO {p.iso} · EC {p.ec >= 0 ? '+' : ''}
                      {p.ec.toFixed(1)} · {Math.round(p.focalLength35mm)}mm
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.slotDelete}
                    onClick={() => onDelete(p.id)}
                    aria-label={`Delete preset ${p.name}`}
                  >
                    ✕
                  </button>
                </li>
              ))
          )}
        </ul>
      )}
    </section>
  )
}
