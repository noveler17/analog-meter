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
      onClick={(e) => {
        e.stopPropagation()
        onChange(!enabled)
      }}
      onPointerUp={(e) => e.stopPropagation()}
      aria-pressed={enabled}
      aria-label="Toggle Zone System"
    >
      Zone System
    </button>
  )
}
