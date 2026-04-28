// AnalogMeter — Exposure Compensation Dial. -3.0 ~ +3.0 EV (1/3 stop).

import { EC_VALUES } from '../../tokens'
import type { EC } from '../../types'
import { ScrollDial } from './ScrollDial'

interface ECDialProps {
  value: EC
  onChange: (v: EC) => void
  /** Zone System ON 시 EC 는 측정에 영향 없음 — 비활성화 */
  disabled?: boolean
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

export function ECDial({ value, onChange, disabled = false }: ECDialProps) {
  return (
    <div
      style={{
        opacity: disabled ? 0.35 : 1,
        pointerEvents: disabled ? 'none' : undefined,
        transition: 'opacity 0.18s',
      }}
      aria-disabled={disabled}
    >
      <ScrollDial<number>
        stops={STOPS}
        value={value}
        onChange={onChange}
        formatLabel={formatEC}
        caption={disabled ? 'Exposure Compensation (ZS off)' : 'Exposure Compensation'}
        ariaLabel="Exposure compensation"
      />
    </div>
  )
}
