// AnalogMeter — Preset 패널 (드로어 + 이름 입력 전담).
// SAVE/LOAD 버튼은 ComboPairsList 헤더로 이동.
// drawerOpen / naming 상태는 App.tsx 에서 제어한다.

import { useEffect, useState } from 'react'
import type { Preset } from '../../types'
import styles from './PresetPanel.module.css'

interface PresetPanelProps {
  presets: Preset[]
  onSave: (name: string) => void
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  /** Preset 목록 드로어 열림 여부 (App.tsx 제어). */
  drawerOpen: boolean
  onDrawerClose: () => void
  /** 이름 입력 모드 활성 여부 (App.tsx 제어). */
  naming: boolean
  onNamingCancel: () => void
}

export function PresetPanel({
  presets,
  onSave,
  onLoad,
  onDelete,
  drawerOpen,
  onDrawerClose,
  naming,
  onNamingCancel,
}: PresetPanelProps) {
  const [draftName, setDraftName] = useState('')

  // naming 활성화될 때 draft 이름 초기화.
  useEffect(() => {
    if (naming) {
      setDraftName(`Preset ${presets.length + 1}`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naming])

  const confirmSave = () => {
    onSave(draftName.trim() || `Preset ${presets.length + 1}`)
    setDraftName('')
    onNamingCancel()
  }

  return (
    <section className={styles.presetPanel} aria-label="Presets">
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmSave()
              if (e.key === 'Escape') onNamingCancel()
            }}
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
            onClick={onNamingCancel}
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
                      onDrawerClose()
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
