// AnalogMeter — Focal Length Dial. 35mm 환산 초점 거리(mm).
// 디바이스의 모든 lens.focalLength35mm 와 표준 시리즈를 병합한 stops.
// 다이얼 값/포맷은 mm. 카메라 zoomFactor 변환은 App.tsx 의 어댑터에서 수행.

import { useMemo } from 'react'
import type { Device, FocalLength35mm } from '../../types'
import { ScrollDial } from './ScrollDial'

interface FocalDialProps {
  value: FocalLength35mm
  onChange: (v: FocalLength35mm) => void
  device: Device | null
}

const STANDARD_FOCALS: readonly number[] = [
  13, 18, 24, 28, 35, 50, 70, 85, 120, 200, 400,
]

function buildFocalStops(device: Device | null): number[] {
  const lensMm = device?.lenses?.map((l) => l.focalLength35mm) ?? []
  // 디바이스가 표현 가능한 최소 mm 미만 표준 stop 은 제외.
  const minMm = lensMm.length > 0 ? Math.min(...lensMm) : 0
  const standard = STANDARD_FOCALS.filter((f) => f >= minMm)
  const merged = Array.from(new Set([...standard, ...lensMm])).sort(
    (a, b) => a - b,
  )
  return merged
}

function formatFocal(v: number): string {
  return `${Math.round(v)}mm`
}

export function FocalDial({ value, onChange, device }: FocalDialProps) {
  const stops = useMemo(() => buildFocalStops(device), [device])
  return (
    <ScrollDial<number>
      stops={stops}
      value={value}
      onChange={onChange}
      formatLabel={formatFocal}
      caption="Focal Length"
      ariaLabel="Focal length (35mm equivalent)"
    />
  )
}
