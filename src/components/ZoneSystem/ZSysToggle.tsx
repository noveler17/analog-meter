// AnalogMeter — Z-SYS 모드 On/Off 토글.

import styles from './ZoneSystem.module.css'

interface ZSysToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
}

export function ZSysToggle({ enabled, onChange }: ZSysToggleProps) {
  return (
    <button
      type="button"
      className={`${styles.zsysToggle} ${enabled ? styles.zsysToggleOn : ''}`}
      onClick={() => onChange(!enabled)}
      aria-pressed={enabled}
      aria-label="Toggle Zone System"
    >
      Z-SYS
    </button>
  )
}
