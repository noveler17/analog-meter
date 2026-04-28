# UI Components — AnalogMeter

> 모든 컴포넌트는 `src/types.ts` (계약) 와 `src/tokens.ts` (디자인 토큰) 만 참조한다.
> 색상/터치타겟 상수는 `src/index.css` 의 CSS 변수(`--green`, `--touch-target` 등)로 노출되며,
> CSS 모듈은 `var(--…)` 만 사용한다.

## 디렉토리 구조

```
src/
├── App.tsx                                  # 3구역 레이아웃 컨테이너 + Worker 와이어링
├── App.module.css
├── index.css                                # 토큰 → CSS 변수 매핑 + 글로벌 리셋
├── state/
│   └── appState.tsx                         # AppStateProvider + useAppState 훅
├── components/
│   ├── CameraPreview/
│   │   ├── CameraPreview.tsx
│   │   └── CameraPreview.module.css
│   ├── ZoneSystem/
│   │   ├── ZoneBar.tsx
│   │   ├── SpotMeter.tsx
│   │   ├── ZSysToggle.tsx
│   │   └── ZoneSystem.module.css
│   ├── ComboPairs/
│   │   ├── ComboPairsList.tsx
│   │   ├── PrioritySettingsModal.tsx
│   │   └── ComboPairs.module.css
│   ├── Dials/
│   │   ├── ScrollDial.tsx                   # 공통 횡스크롤+스냅 베이스
│   │   ├── ISODial.tsx
│   │   ├── ECDial.tsx
│   │   ├── FocalDial.tsx
│   │   └── Dials.module.css
│   ├── MeasureButton/
│   │   ├── MeasureButton.tsx
│   │   └── MeasureButton.module.css
│   ├── Presets/
│   │   ├── PresetPanel.tsx
│   │   └── PresetPanel.module.css
│   └── GitHubLink/
│       ├── GitHubLink.tsx
│       └── GitHubLink.module.css
```

## Props 시그니처 요약

### `<CameraPreview>`
```ts
interface CameraPreviewProps {
  ev: EV | null
  focalZoom: FocalZoom
  zoneSysEnabled: boolean
  errorMessage?: string | null
  onTap?: (nx: number, ny: number) => void   // 0~1 정규화 좌표
  children?: ReactNode                        // Spot/ZoneBar 등 오버레이
}
// forwardRef → handle.getVideoElement(): HTMLVideoElement | null
```

### `<ZoneBar>`
```ts
interface ZoneBarProps { currentZone: ZoneIndex | null }
```
Zone III ~ VII 만 표시 (PRD 2.1, ZONES.BAR_MIN/BAR_MAX).

### `<SpotMeter>`
```ts
interface SpotMeterProps {
  x: number; y: number  // 0~1
  zone: ZoneIndex
  ev: number
}
```

### `<ZSysToggle>`
```ts
interface ZSysToggleProps { enabled: boolean; onChange: (b: boolean) => void }
```

### `<ComboPairsList>`
```ts
interface ComboPairsListProps {
  pairs: ComboPairHighlighted[]              // Worker 가 적용한 하이라이트 그대로
  priorityF: FRange | null
  prioritySS: SSRange | null
  onChangePriority: (f: FRange | null, ss: SSRange | null) => void
}
```
- matchF XOR matchSS → `pairOne` 클래스 (글씨 초록).
- matchF AND matchSS → `pairBoth` 클래스 (테두리 초록 + 글로우).
- 추가 계산 없음 (PRD 2.2 / contracts §E).

### `<PrioritySettingsModal>`
```ts
interface PrioritySettingsModalProps {
  priorityF: FRange | null
  prioritySS: SSRange | null
  onApply: (f: FRange | null, ss: SSRange | null) => void
  onClose: () => void
}
```
F/SS 각각 ON/OFF + MIN/MAX `<select>` (1/3 스탑 토큰 옵션).

### `<ScrollDial<T extends number>>`
```ts
interface ScrollDialProps<T> {
  stops: readonly T[]
  value: T
  onChange: (v: T) => void
  formatLabel: (v: T) => string
  caption?: string
  cellWidth?: number   // 기본 56 (>= 44)
  ariaLabel?: string
}
```
- `scroll-snap-type: x mandatory` + `scroll-snap-align: center`.
- ResizeObserver 기반 양옆 spacer 로 첫/끝 셀이 정확히 중앙에 위치.
- 외부 value 변경 시 `scrollTo` 동기화 (programmatic flag 로 onScroll loop 차단).

### `<ISODial>` / `<ECDial>` / `<FocalDial>`
모두 ScrollDial 래핑.
- `ISODial` → `ISO_VALUES` (25 ~ 25600).
- `ECDial`  → `EC_VALUES` (-3.0 ~ +3.0). `+0.3`, `−1.0` 형식 포맷.
- `FocalDial(device)` → 1.0~5.0 + device.lenses.zoomFactor 합집합 정렬.

### `<MeasureButton>`
```ts
interface MeasureButtonProps {
  onMeasure: () => void
  disabled?: boolean
  lastMeasuredAt?: number | null  // ms epoch — 보조 표시
}
```
대형 버튼 (height 60px ≥ TOUCH_TARGET). 누름 시 0.28s pulse 애니메이션.

### `<PresetPanel>`
```ts
interface PresetPanelProps {
  presets: Preset[]
  onSave: (name: string) => void
  onLoad: (id: string) => void
  onDelete: (id: string) => void
}
```
SAVE → 인라인 이름 입력 → 저장 / LOAD → 슬롯 드로어 토글 / 슬롯별 ✕ 삭제.

### `<GitHubLink>`
Props 없음. `position: fixed` 우측 하단. SVG `currentColor` = `var(--white)`.
`https://github.com/noveler17/analog-meter/issues` 새 탭으로 open.

## App 통합

`src/App.tsx` 가 `AppStateProvider` 로 감싸고:
- 마운트 시 `previewRef` → `startCamera({video, onMessage})` 호출.
- ISO/EC/FocalZoom/Priority 상태 변화를 `useEffect` 로 감지해 각각 `set-iso`/`set-ec`/`set-focal`/`set-priority` 메시지 송신.
- Z-SYS ON 일 때만 탭 → `requestSpot(nx, ny)` 트리거 + Spot 마커 렌더.
- MEASURE 버튼은 `liveResult` 가 존재할 때만 활성. `pushMeasure(liveResult)` 로 로그 추가.
