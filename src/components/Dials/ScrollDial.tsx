// AnalogMeter — ScrollDial: 횡스크롤 + 1/3 스탑 스냅 다이얼.
// ISO/EC/Focal 다이얼이 모두 이 컴포넌트를 래핑한다.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'
import styles from './Dials.module.css'

export interface ScrollDialProps<T extends number> {
  stops: readonly T[]
  value: T
  onChange: (v: T) => void
  formatLabel: (v: T) => string
  /** 다이얼 좌측에 표시할 라벨 (ex: 'ISO'). */
  caption?: string
  /** 한 셀 너비 (px). 기본 56. 44 이상 권장. */
  cellWidth?: number
  /** ARIA 라벨. */
  ariaLabel?: string
}

/**
 * 핵심 동작:
 *  - 컨테이너 양 옆에 padding 을 두어, 선택된 셀이 정확히 중앙에 오게 한다.
 *  - scroll-snap-type: x mandatory + scroll-snap-align: center 로 스냅.
 *  - onScroll 에서 가장 가까운 인덱스를 계산해 onChange 호출.
 *  - value prop 변경 시 외부에서 강제로 스크롤 위치를 동기화.
 */
export function ScrollDial<T extends number>({
  stops,
  value,
  onChange,
  formatLabel,
  caption,
  cellWidth = 56,
  ariaLabel,
}: ScrollDialProps<T>) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const lastEmittedIndex = useRef<number>(-1)
  const isProgrammaticScroll = useRef<boolean>(false)
  const rafHandle = useRef<number | null>(null)

  const currentIndex = useMemo(() => {
    // 정확 일치 우선. 실패 시 가장 가까운 값으로 fallback.
    const exact = stops.indexOf(value)
    if (exact >= 0) return exact
    let best = 0
    let bestDist = Math.abs(Number(value) - Number(stops[0]))
    for (let i = 1; i < stops.length; i++) {
      const d = Math.abs(Number(value) - Number(stops[i]))
      if (d < bestDist) {
        best = i
        bestDist = d
      }
    }
    return best
  }, [stops, value])

  // 외부 value 변경 시 스크롤 위치 동기화.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const target = currentIndex * cellWidth
    if (Math.abs(el.scrollLeft - target) > 1) {
      isProgrammaticScroll.current = true
      el.scrollTo({ left: target, behavior: 'auto' })
      // 스크롤 이벤트가 한두 번 발생할 수 있으므로 잠시 후 플래그 해제.
      window.setTimeout(() => {
        isProgrammaticScroll.current = false
      }, 50)
    }
  }, [currentIndex, cellWidth])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    if (isProgrammaticScroll.current) return
    if (rafHandle.current !== null) cancelAnimationFrame(rafHandle.current)
    rafHandle.current = requestAnimationFrame(() => {
      const idx = Math.round(el.scrollLeft / cellWidth)
      const clamped = Math.max(0, Math.min(stops.length - 1, idx))
      if (clamped !== lastEmittedIndex.current) {
        lastEmittedIndex.current = clamped
        const next = stops[clamped]
        if (next !== value) {
          onChange(next)
        }
      }
    })
  }, [cellWidth, onChange, stops, value])

  useEffect(() => {
    return () => {
      if (rafHandle.current !== null) cancelAnimationFrame(rafHandle.current)
    }
  }, [])

  // 양쪽 padding — 선택된 셀이 중앙에 위치하도록.
  // (실제 padding 은 ResizeObserver 가 아닌 단순 % 로 처리하면 너무 크므로
  //  내부 spacer div 로 처리한다.)

  return (
    <div className={styles.dialWrapper} aria-label={ariaLabel}>
      {caption && <div className={styles.dialCaption}>{caption}</div>}
      <div
        ref={scrollRef}
        className={styles.dialScroll}
        onScroll={handleScroll}
        role="slider"
        aria-valuemin={Number(stops[0])}
        aria-valuemax={Number(stops[stops.length - 1])}
        aria-valuenow={Number(value)}
        tabIndex={0}
      >
        <Spacer cellWidth={cellWidth} />
        {stops.map((stop, idx) => {
          const active = idx === currentIndex
          return (
            <button
              key={`${idx}-${stop}`}
              type="button"
              className={`${styles.dialItem} ${active ? styles.dialItemActive : ''}`}
              style={{ minWidth: cellWidth, width: cellWidth }}
              onClick={() => onChange(stop)}
              aria-pressed={active}
            >
              {formatLabel(stop)}
            </button>
          )
        })}
        <Spacer cellWidth={cellWidth} />
      </div>
      {/* 중앙 인디케이터 (캐럿). */}
      <div className={styles.dialCarat} aria-hidden="true" />
    </div>
  )
}

/**
 * 스크롤 컨테이너 양옆에 두는 빈 공간.
 * 컨테이너 너비 - cellWidth 의 절반 만큼 채워서 첫 셀이 중앙에 올 수 있게 한다.
 */
function Spacer({ cellWidth }: { cellWidth: number }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const parent = el.parentElement
      if (!parent) return
      const width = (parent.clientWidth - cellWidth) / 2
      el.style.minWidth = `${Math.max(0, width)}px`
      el.style.width = `${Math.max(0, width)}px`
    }
    update()
    const ro = new ResizeObserver(update)
    if (el.parentElement) ro.observe(el.parentElement)
    return () => ro.disconnect()
  }, [cellWidth])
  return <div ref={ref} aria-hidden="true" style={{ flexShrink: 0 }} />
}
