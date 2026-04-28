// AnalogMeter — MEASURE 버튼.
// 누르면 현재 EVResult 를 measureLog 에 push 한다.

import { useCallback, useState } from 'react'
import styles from './MeasureButton.module.css'

interface MeasureButtonProps {
  onMeasure: () => void
  disabled?: boolean
  /** 마지막 측정 시각 (ms). 표시용. */
  lastMeasuredAt?: number | null
  /** Zone System 활성 상태에서 아직 spot을 선택하지 않은 경우 안내 텍스트 표시. */
  zoneSysActive?: boolean
}

export function MeasureButton({
  onMeasure,
  disabled,
  lastMeasuredAt,
  zoneSysActive,
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
      <span className={styles.label}>{zoneSysActive ? 'TAP TO METER' : 'MEASURE'}</span>
      {lastMeasuredAt && !zoneSysActive && (
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
