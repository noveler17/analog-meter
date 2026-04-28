# UI Engineer — Implementation Notes

## 1. Worker 와이어링 방식

`startCamera` (lib/camera.ts) 를 App.tsx 마운트 시 1회 호출.
- `previewRef.current.getVideoElement()` 로 `<video>` ref 를 얻어 옵션에 전달.
- onMessage 콜백 → `WorkerResult` 타입별 분기.
  - `'ev-update'`: WorkerResult 페이로드를 `EVResult` 모양으로 재구성 후 `applyLive(result, zone)` + 로컬 `setPairs` 호출.
  - `'spot-result'`: `addSpot({id, x, y, zone, ev})`.
  - `'error'`: `cameraError` state 에 보관 → CameraPreview 가 errorOverlay 표시.
  - `'ready'`: 에러 클리어.
- 다이얼 변경 → `useEffect([state.iso])` 등에서 `session.send({type:'set-iso', iso})`.
  - Worker 쪽에서 ISO/EC/Focal/Priority 모두 echo 되어 다음 ev-update 에 그대로 회신됨.
- 언마운트 → `session.stop()` (rVFC 핸들 + worker.terminate + stream.getTracks().stop()).

**60fps 대응**: Worker 가 `PERF.WORKER_INTERVAL_MS = 33.3ms` (30fps) 로 송신.
React re-render 는 ev-update 1회당 1번 발생. UI는 ZoneBar/CameraPreview 의 `lastEV` text 와
ComboPairsList 만 업데이트 — 트리 깊이가 얕아 60fps 유지 가능.

## 2. 디자인 토큰 운영

`src/tokens.ts` 의 모든 컬러/폰트/사이즈 상수를 `src/index.css` 의 `:root { --bg, --green, … }` 로 1:1 매핑.
컴포넌트 CSS 모듈은 `var(--…)` 만 참조 — TSX 측에서도 `COLORS.GREEN` 직접 사용 0건 (인라인 스타일이 필요한
경우 `style={{borderColor: tone}}` 등 ZONE_GRADIENT_STEPS[zone] 토큰을 거친 값만 사용).

**확인된 예외 0건** (TSX/CSS 모듈 내 hex/44 하드코딩 없음).

## 3. localStorage 스키마

```ts
key: 'analog-meter:presets'
value: Preset[]   // 최대 10개. 시간순 push, 초과 시 가장 오래된 항목 제거.
```

저장 실패 (private mode / quota) 시 try/catch 흡수 — React state 만 유지되어 세션 동안은 사용 가능.

## 4. 레이아웃 결정 근거 (PRD §2.1~2.3)

3구역 분할 (`App.module.css`):

| 구역 | 높이 | 비고 |
|------|------|------|
| Top (CameraPreview) | `45dvh`, min 280, max 520 | iOS 사파리 주소창 변동 대응 (dvh) |
| Center (ComboPairs) | `flex: 1` | 스크롤 가능, 가변 |
| Bottom (Controls)   | `auto`, safe-area 패딩 | Measure + Dial stack + Preset |

**작은 폰 (< 700px 높이)**: Top 38dvh / min 220 — 컨트롤 영역 우선 확보.
**큰 폰 (> 900px)**: Top 50dvh — 라이브뷰 더 많은 영역 차지.

다이얼 3종 (Focal/ISO/EC) 은 단일 `dialStack` 카드로 묶어 시각적 그룹화. 각 다이얼 사이에는
`dialDivider` 1px 라인. 각 다이얼은 자체 caption (ZOOM/ISO/EC) 으로 식별.

## 5. 터치 타겟 / 제스처

- 글로벌 `touch-action: manipulation` (index.css `*`).
- `<video>` 엘리먼트는 `pointer-events: none` 으로 두고 컨테이너에 `onPointerUp` — `<video>` 의 default
  fullscreen tap 동작을 차단하면서 좌표 수집.
- 수평 스크롤 다이얼은 `touch-action: pan-x` 로 세로 제스처(전체 페이지 pull-to-refresh) 와 격리.
- Modal backdrop 은 `pointer-events` 로 backdrop click 시 close. 카드 내부는 이벤트 stop.
- 모든 button / role=button: 글로벌 CSS 가 `min-width/min-height: var(--touch-target)` 강제.

## 6. 상태 관리 — Context vs Zustand

Context + useReducer 로 결정.
- 외부 라이브러리 의존성 0 (이미 React 만 사용).
- 액션 수가 ~12개로 한정적 — reducer 가독성 우수.
- AppStateProvider 가 한 번만 마운트되며 자식 트리가 작아 re-render 비용 낮음.
- liveResult 는 매 ev-update 마다 갱신되지만 setPairs 와 함께 한 번에 applyLive 한 번 호출.

## 7. Worker → EVResult 매핑 (계약 재확인)

contracts.md §C 에 따라 WorkerResult.ev-update 페이로드를 EVResult 와 1:1 매핑:

| WorkerResult 필드 | → | EVResult 필드 |
|-------------------|----|---------------|
| ev                | → | ev            |
| evRaw             | → | evRaw         |
| iso (echo)        | → | iso           |
| ec (echo)         | → | ec            |
| pairs             | → | pairs         |
| priorityF (echo)  | → | priorityF     |
| prioritySS (echo) | → | prioritySS    |
| measuredAt        | → | measuredAt    |

zone 은 EVResult 에 없는 별도 필드 → AppState 의 `currentZone` 으로 분기 보관 (ZoneBar 렌더 용).

## 8. 빌드 결과

```
pnpm build → vite v5.4.21
  dist/assets/luminance.worker-*.js   4.01 kB
  dist/assets/index-*.css            14.40 kB │ gzip: 3.39 kB
  dist/assets/index-*.js            173.49 kB │ gzip: 55.05 kB
  PWA precache 15 entries (189.92 KiB)
```

`pnpm lint` → 0 errors / 1 warning (`appState.tsx` 에 useAppState 훅이 컴포넌트와 같은 파일에서 export
되어 react-refresh HMR 권고 — 런타임 영향 없음).
