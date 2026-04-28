// AnalogMeter — ISO Dial. 25 ~ 25600 (1/3 stop), 토큰 기반.

import { ISO_VALUES } from '../../tokens'
import type { ISO } from '../../types'
import { ScrollDial } from './ScrollDial'

interface ISODialProps {
  value: ISO
  onChange: (v: ISO) => void
}

// 토큰의 readonly tuple 을 일반 number 배열로 한 번 캐스팅 (참조 동일).
const STOPS: readonly number[] = ISO_VALUES

export function ISODial({ value, onChange }: ISODialProps) {
  return (
    <ScrollDial<number>
      stops={STOPS}
      value={value}
      onChange={onChange}
      formatLabel={(v) => String(v)}
      caption="ISO"
      ariaLabel="ISO sensitivity"
    />
  )
}
