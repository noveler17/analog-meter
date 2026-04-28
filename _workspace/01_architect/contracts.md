# Contracts — AnalogMeter Shared Types & Tokens

> 본 문서는 `src/types.ts`와 `src/tokens.ts`의 인터페이스 카탈로그다.
> engine-engineer (Worker)와 ui-engineer (React)가 바인딩 참조로 사용한다.
> 코드를 수정할 때는 반드시 본 문서도 함께 갱신할 것.

---

## A. Scalar Aliases (`src/types.ts`)

각 도메인 값을 의미 있는 별칭으로 노출하여 함수 시그니처의 가독성을 높인다.

| Alias          | 베이스   | 도메인              | 사용처                                |
| -------------- | -------- | ------------------- | ------------------------------------- |
| `ISO`          | `number` | 25 ~ 25600          | ISO 다이얼, EV 보정                   |
| `EC`           | `number` | -3.0 ~ +3.0         | 노출 보정 다이얼, EV 보정             |
| `FStop`        | `number` | 1.2 ~ 22            | 조리개, ComboPair, 우선순위 F 범위    |
| `ShutterSpeed` | `number` | 1/8000 ~ 30 (sec)   | 셔터, ComboPair, 우선순위 SS 범위     |
| `EV`           | `number` | 임의 EV             | Worker 출력, 노출 계산                |
| `FocalZoom`    | `number` | 1.0 ~ 5.0           | Focal 다이얼, 가이드 박스 크기        |

---

## B. Zone System

### `ZoneIndex` (alias: `Zone`)
`0 | 1 | ... | 10` — Ansel Adams Zone System 0(순흑) ~ X(순백).
- engine-engineer: 루미넌스를 11단계로 분류할 때 사용.
- ui-engineer: ZoneBar, SpotMeter 색상 매핑 키.

### `ZONE_ROMAN`
`Record<ZoneIndex, string>` — UI 라벨링용 (`'III'`, `'VII'` 등).

### `ZoneReading`
- `zone: ZoneIndex` — 분류된 Zone.
- `ev: EV` — 해당 Zone의 EV.
- `luminance: number` — 0~1 정규화 평균 휘도.

---

## C. Worker Messages

### `WorkerRequest` (`= WorkerMessageIn`)
메인 → Worker로 전달되는 요청.

| 필드          | 타입                                                                                                    | 설명                                  |
| ------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `type`        | `'start' \| 'stop' \| 'frame' \| 'set-iso' \| 'set-ec' \| 'set-focal' \| 'set-priority' \| 'sample-spot'` | 메시지 타입                          |
| `iso?`        | `ISO`                                                                                                   | `set-iso` / `start` 시                |
| `ec?`         | `EC`                                                                                                    | `set-ec` / `start` 시                 |
| `focalZoom?`  | `FocalZoom`                                                                                             | `set-focal` 시                        |
| `priorityF?`  | `FRange \| null`                                                                                        | `set-priority` 시                     |
| `prioritySS?` | `SSRange \| null`                                                                                       | `set-priority` 시                     |
| `spotX?`      | `number`                                                                                                | `sample-spot` 시 (0~1 정규화 좌표)    |
| `spotY?`      | `number`                                                                                                | `sample-spot` 시                      |
| `frame?`      | `ImageBitmap`                                                                                           | `frame` / `sample-spot` 시. 카메라 프레임. transferable 로 전달. |

### `WorkerResult` (`= WorkerMessageOut`)
Worker → 메인 응답.

| 필드          | 타입                                                  | 설명                              |
| ------------- | ----------------------------------------------------- | --------------------------------- |
| `type`        | `'ev-update' \| 'spot-result' \| 'error' \| 'ready'`  | 메시지 타입                       |
| `ev?`         | `EV`                                                  | ISO/EC 보정 후 최종 EV            |
| `evRaw?`      | `EV`                                                  | ISO 100, EC 0 기준 원시 EV        |
| `zone?`       | `ZoneIndex`                                           | 메인 피사체 Zone                  |
| `luminance?`  | `number`                                              | 0~1 정규화 평균 휘도              |
| `timestamp`   | `number`                                              | `performance.now()` (필수)        |
| `spot?`       | `SpotResult`                                          | `spot-result` 시                  |
| `error?`      | `string`                                              | `error` 시                        |
| `pairs?`      | `ComboPairHighlighted[]`                              | `ev-update` 시. 우선순위 하이라이트 적용 완료. UI는 추가 계산 금지 |
| `iso?`        | `ISO`                                                 | `ev-update` 시. Worker 내부 ISO 그대로 echo |
| `ec?`         | `EC`                                                  | `ev-update` 시                    |
| `priorityF?`  | `FRange \| null`                                      | `ev-update` 시                    |
| `prioritySS?` | `SSRange \| null`                                     | `ev-update` 시                    |
| `measuredAt?` | `number`                                              | `ev-update` 시. `Date.now()`      |

> 60fps 보장을 위해 Worker는 `ev-update`를 30fps(`PERF.WORKER_INTERVAL_MS`) 주기로 송신.
> `ev-update` 페이로드는 `EVResult`와 1:1 매핑되며, UI는 그대로 store에 보관할 수 있다.

### `SpotResult`
사용자가 화면을 탭했을 때 반환.
- `zone, ev, x, y` — 탭 좌표는 0~1 정규화.

---

## D. Device DB

### `CameraLens`
- `focalLength35mm: number` — 35mm 환산 mm.
- `maxAperture: FStop` — 고정 최대 조리개.
- `zoomFactor: FocalZoom` — 1.0(메인), 0.5(울트라와이드), 2/3/5 등.
- `label: string` — UI 라벨.

### `Device`
- `id, brand, model` — 기기 식별.
- `lenses: CameraLens[]` — 사용 가능한 모든 렌즈.
- `sensorSizeMm?: number` — 메타 정보.

> engine-engineer는 Device DB(JSON 또는 TS 모듈)를 `src/lib/devices.ts`로 작성하고 본 인터페이스를 따른다.

---

## E. Exposure & Combos

### `ComboPair`
한 쌍의 조리개+셔터 조합.
- `aperture: FStop`, `apertureLabel: string` (예: `'f/2.8'`).
- `shutterSpeed: ShutterSpeed`, `shutterLabel: string` (예: `'1/1000'`, `'2"'`).

### `FRange = [FStop, FStop]`, `SSRange = [ShutterSpeed, ShutterSpeed]`
사용자가 설정창에서 지정한 우선순위 범위.

### `ComboPairHighlighted extends ComboPair`
- `matchF: boolean` — F 범위 만족.
- `matchSS: boolean` — SS 범위 만족.
- ui-engineer: `matchF XOR matchSS` → 글씨 초록, `matchF && matchSS` → 테두리 초록 (PRD 2.2).

### `EVResult`
Worker가 계산한 노출 결과 종합.
- `ev`, `evRaw`, `iso`, `ec`.
- `pairs: ComboPairHighlighted[]` — 모든 조합 + 하이라이트.
- `priorityF, prioritySS` — 현재 적용된 우선순위.
- `measuredAt: number` — `Date.now()`.

---

## F. Presets

### `Preset`
`SAVE PRESET`으로 저장된 슬롯.
- `id, name`.
- `iso, ec, focalZoom`.
- `priorityF, prioritySS`.
- `savedAt: number` — `Date.now()`.

> ui-engineer: localStorage에 직렬화. key = `analog-meter:presets`.

---

## G. App State

### `AppState`
React 전역 상태 (Context 또는 Zustand).
- `iso, ec, focalZoom, device`.
- `priorityF, prioritySS`.
- `zoneSysEnabled: boolean` — Z-SYS 토글.
- `lastEV: EV | null`.
- `measureLog: EVResult[]` — MEASURE 버튼이 push.
- `presets: Preset[]`.

---

## H. Design Tokens (`src/tokens.ts`)

### Colors
- `BG_BLACK = '#000000'` — 단독 export.
- `CLOVER_GREEN = '#00FF41'` — 단독 export.
- `COLORS.{BG, GREEN, GREEN_DIM, GREEN_GLOW, WHITE, GRAY_900..GRAY_300, RED_WARN}`.

### Typography
- `TYPOGRAPHY.{FONT_MONO, FONT_SANS, SIZE_XS..SIZE_2XL}`.

### Spacing
- `TOUCH_TARGET_MIN = 44` — 단독 export.
- `SPACING.{TOUCH_TARGET, XS, SM, MD, LG, XL, XXL}`.

### Zones
- `ZONE_GRADIENT_STEPS` — 11단계 무채색 (`#000000` ~ `#FFFFFF`).
- `ZONES.{COLORS, BAR_MIN: 3, BAR_MAX: 7}` — Zone Bar는 III ~ VII 표시.

### Exposure 1/3-Stop Series
- `ISO_VALUES` — 25부터 25600까지.
- `EC_VALUES` — -3.0 ~ +3.0.
- `F_STOP_VALUES` — 1.2 ~ 22.
- `SHUTTER_VALUES` — 30s ~ 1/8000s.
- `FOCAL_ZOOM_MIN = 1.0`, `FOCAL_ZOOM_MAX = 5.0`.

### Performance
- `PERF.WORKER_INTERVAL_MS` — Worker 송신 주기 (33.3ms).
- `PERF.UI_THROTTLE_MS` — UI throttle (16.7ms).

---

## 바인딩 규칙

1. **하드코딩 금지**: 색상 hex / `44`px / 1/3 스탑 값 등을 토큰 외부에서 직접 쓰지 않는다.
2. **Worker 양방향 메시지**는 반드시 `WorkerMessageIn` / `WorkerMessageOut` 으로 타입 단언 (`postMessage(msg as WorkerMessageIn)`).
3. **EVResult.pairs**는 항상 우선순위 하이라이트가 적용된 상태로 메인에 도착해야 한다 (UI는 추가 계산하지 않는다).
4. **Worker 입력 프레임**은 `ImageBitmap`으로만 전달 (메인에서 `createImageBitmap(video)` 후 transferable로 전송).
