// AnalogMeter — Exposure Compensation Dial. -3.0 ~ +3.0 EV (1/3 stop).

import { EC_VALUES } from '../../tokens'
import type { EC } from '../../types'
import { ScrollDial } from './ScrollDial'

interface ECDialProps {
  value: EC
  onChange: (v: EC) => void
}

const STOPS: readonly number[] = EC_VALUES

function formatEC(v: number): string {
  if (v === 0) return '0'
  const sign = v > 0 ? '+' : '−'
  const abs = Math.abs(v)
  // 정수 (1, 2, 3) 는 소수 없이, 1/3 단위는 한 자리 소수.
  if (Number.isInteger(abs)) return `${sign}${abs.toFixed(0)}`
  return `${sign}${abs.toFixed(1)}`
}

export function ECDial({ value, onChange }: ECDialProps) {
  return (
    <ScrollDial<number>
      stops={STOPS}
      value={value}
      onChange={onChange}
      formatLabel={formatEC}
      caption="Exposure Compensation"
      ariaLabel="Exposure compensation"
    />
  )
}
