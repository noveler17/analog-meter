// AnalogMeter — Settings Modal (Priority 범위 + Theme + GitHub 링크).
// 기존 PrioritySettingsModal에서 확장: 테마 선택과 GitHub 이슈 링크 추가.

import { useMemo, useState } from 'react'
import { F_STOP_VALUES, SHUTTER_VALUES } from '../../tokens'
import type { FRange, FStop, SSRange, ShutterSpeed } from '../../types'
import {
  formatAperture,
  formatShutter,
} from '../../lib/exposure-engine'
import type { Theme } from '../../state/appState'
import styles from './ComboPairs.module.css'

const GITHUB_ISSUES_URL = 'https://github.com/noveler17/analog-meter/issues'

interface SettingsModalProps {
  priorityF: FRange | null
  prioritySS: SSRange | null
  theme: Theme
  onApply: (f: FRange | null, ss: SSRange | null) => void
  onThemeChange: (t: Theme) => void
  onClose: () => void
}

export function SettingsModal({
  priorityF,
  prioritySS,
  theme,
  onApply,
  onThemeChange,
  onClose,
}: SettingsModalProps) {
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
      aria-label="Settings"
    >
      <div className={styles.modalCard}>
        <header className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>SETTINGS</h2>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        {/* Theme */}
        <fieldset className={styles.modalGroup}>
          <legend className={styles.modalLegend}>
            <span className={styles.modalGroupTitle}>THEME</span>
          </legend>
          <div className={styles.themeRow}>
            {(['system', 'dark', 'light'] as const).map((t) => (
              <label key={t} className={styles.themeOption}>
                <input
                  type="radio"
                  name="theme"
                  value={t}
                  checked={theme === t}
                  onChange={() => onThemeChange(t)}
                />
                <span className={styles.themeLabel}>
                  {t === 'system' ? 'SYSTEM' : t === 'dark' ? 'DARK' : 'LIGHT'}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

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

        {/* GitHub 링크 */}
        <a
          href={GITHUB_ISSUES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.githubLink}
        >
          <GithubIcon />
          Report issue on GitHub
        </a>

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

function GithubIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 98 96"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
      />
    </svg>
  )
}
