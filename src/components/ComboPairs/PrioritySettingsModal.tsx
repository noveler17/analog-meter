// AnalogMeter — Priority F/SS 범위 설정 오버레이.
// 선택된 두 점이 [min, max] 가 되어 ComboPair 하이라이트에 사용된다.

import { useMemo, useState } from 'react'
import { F_STOP_VALUES, SHUTTER_VALUES } from '../../tokens'
import type { FRange, FStop, SSRange, ShutterSpeed } from '../../types'
import {
  formatAperture,
  formatShutter,
} from '../../lib/exposure-engine'
import styles from './ComboPairs.module.css'

interface PrioritySettingsModalProps {
  priorityF: FRange | null
  prioritySS: SSRange | null
  onApply: (f: FRange | null, ss: SSRange | null) => void
  onClose: () => void
}

export function PrioritySettingsModal({
  priorityF,
  prioritySS,
  onApply,
  onClose,
}: PrioritySettingsModalProps) {
  const [fEnabled, setFEnabled] = useState<boolean>(priorityF !== null)
  const [fLow, setFLow] = useState<FStop>(priorityF?.[0] ?? F_STOP_VALUES[3])
  const [fHigh, setFHigh] = useState<FStop>(priorityF?.[1] ?? F_STOP_VALUES[10])
  const [ssEnabled, setSSEnabled] = useState<boolean>(prioritySS !== null)
  const [ssLow, setSSLow] = useState<ShutterSpeed>(
    prioritySS?.[0] ?? SHUTTER_VALUES[SHUTTER_VALUES.length - 20],
  )
  const [ssHigh, setSSHigh] = useState<ShutterSpeed>(
    prioritySS?.[1] ?? SHUTTER_VALUES[SHUTTER_VALUES.length - 5],
  )

  const fOptions = useMemo(() => F_STOP_VALUES.map((v) => ({ v, label: formatAperture(v) })), [])
  const ssOptions = useMemo(
    () => SHUTTER_VALUES.map((v) => ({ v, label: formatShutter(v) })),
    [],
  )

  const apply = () => {
    const fRange: FRange | null = fEnabled
      ? ([Math.min(fLow, fHigh), Math.max(fLow, fHigh)] as FRange)
      : null
    const ssRange: SSRange | null = ssEnabled
      ? ([Math.min(ssLow, ssHigh), Math.max(ssLow, ssHigh)] as SSRange)
      : null
    onApply(fRange, ssRange)
  }

  return (
    <div
      className={styles.modalBackdrop}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Priority range settings"
    >
      <div className={styles.modalCard}>
        <header className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>PRIORITY RANGES</h2>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        {/* F range */}
        <fieldset className={styles.modalGroup}>
          <legend className={styles.modalLegend}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={fEnabled}
                onChange={(e) => setFEnabled(e.target.checked)}
              />
              APERTURE F
            </label>
          </legend>
          <div className={styles.rangeRow}>
            <SelectStop
              label="MIN"
              value={fLow}
              options={fOptions}
              onChange={setFLow}
              disabled={!fEnabled}
            />
            <SelectStop
              label="MAX"
              value={fHigh}
              options={fOptions}
              onChange={setFHigh}
              disabled={!fEnabled}
            />
          </div>
        </fieldset>

        {/* SS range */}
        <fieldset className={styles.modalGroup}>
          <legend className={styles.modalLegend}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={ssEnabled}
                onChange={(e) => setSSEnabled(e.target.checked)}
              />
              SHUTTER SPEED
            </label>
          </legend>
          <div className={styles.rangeRow}>
            <SelectStop
              label="MIN"
              value={ssLow}
              options={ssOptions}
              onChange={setSSLow}
              disabled={!ssEnabled}
            />
            <SelectStop
              label="MAX"
              value={ssHigh}
              options={ssOptions}
              onChange={setSSHigh}
              disabled={!ssEnabled}
            />
          </div>
        </fieldset>

        <footer className={styles.modalFooter}>
          <button type="button" className={styles.modalBtn} onClick={onClose}>
            CANCEL
          </button>
          <button
            type="button"
            className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
            onClick={apply}
          >
            APPLY
          </button>
        </footer>
      </div>
    </div>
  )
}

interface SelectStopProps {
  label: string
  value: number
  options: { v: number; label: string }[]
  onChange: (v: number) => void
  disabled?: boolean
}

function SelectStop({ label, value, options, onChange, disabled }: SelectStopProps) {
  return (
    <label className={styles.selectLabel}>
      <span className={styles.selectCaption}>{label}</span>
      <select
        className={styles.selectInput}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
