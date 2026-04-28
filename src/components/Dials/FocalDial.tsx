// AnalogMeter — Focal Zoom Dial. 1.0x ~ 5.0x.
// device.lenses 의 zoomFactor 를 우선 표시하되, 사이값(1.5x 등)도 1/3 stop 시리즈로 보강.

import { useMemo } from 'react'
import type { Device, FocalZoom } from '../../types'
import { ScrollDial } from './ScrollDial'

interface FocalDialProps {
  value: FocalZoom
  onChange: (v: FocalZoom) => void
  device: Device | null
}

/**
 * 1x ~ 5x 사이를 0.5 단위로 + device 가 가진 zoomFactor (0.5x 등 ultra-wide 포함)
 * 를 합쳐 정렬한 stop 배열을 반환.
 */
function buildFocalStops(device: Device | null): number[] {
  const base: number[] = []
  for (let v = 1.0; v <= 5.0 + 1e-6; v += 0.5) {
    base.push(Math.round(v * 10) / 10)
  }
  const extras = device?.lenses?.map((l) => l.zoomFactor) ?? []
  const merged = Array.from(new Set([...base, ...extras])).sort((a, b) => a - b)
  return merged
}

function formatFocal(v: number): string {
  if (Number.isInteger(v)) return `${v.toFixed(0)}x`
  return `${v.toFixed(1)}x`
}

export function FocalDial({ value, onChange, device }: FocalDialProps) {
  const stops = useMemo(() => buildFocalStops(device), [device])
  return (
    <ScrollDial<number>
      stops={stops}
      value={value}
      onChange={onChange}
      formatLabel={formatFocal}
      caption="ZOOM"
      ariaLabel="Focal length zoom"
    />
  )
}
