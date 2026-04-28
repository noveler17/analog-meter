// AnalogMeter — MEASURE 버튼.
// 누르면 현재 EVResult 를 measureLog 에 push 한다.

import { useCallback, useState } from 'react'
import styles from './MeasureButton.module.css'

interface MeasureButtonProps {
  onMeasure: () => void
  disabled?: boolean
  /** 마지막 측정 시각 (ms). 표시용. */
  lastMeasuredAt?: number | null
}

export function MeasureButton({
  onMeasure,
  disabled,
  lastMeasuredAt,
}: MeasureButtonProps) {
  const [pulse, setPulse] = useState(false)

  const handle = useCallback(() => {
    if (disabled) return
    onMeasure()
    setPulse(true)
    window.setTimeout(() => setPulse(false), 280)
  }, [disabled, onMeasure])

  return (
    <button
      type="button"
      className={`${styles.measureBtn} ${pulse ? styles.pulse : ''}`}
      onClick={handle}
      disabled={disabled}
      aria-label="Measure and store current EV reading"
    >
      <span className={styles.label}>MEASURE</span>
      {lastMeasuredAt && (
        <span className={styles.timestamp}>
          {new Date(lastMeasuredAt).toLocaleTimeString([], {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      )}
    </button>
  )
}
