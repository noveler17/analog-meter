# AnalogMeter QA Final Report

STATUS: PASS

> 모든 모듈 경계와 PRD 매핑이 정합한다. 빌드/린트는 0 errors. Critical/Major 이슈 없음.
> Minor 이슈 3건만 권고 사항으로 기록 (배포 차단 요인 아님).

## 요약

- 총 체크 항목: **8** (Worker boundary, EV formula, Design tokens, PWA manifest, GH Actions, 44px touch target, Build & Lint, PRD 기능 매핑)
- PASS: **8**
- FAIL: **0**
- WARN: **3** (Minor — 운영에 영향 없음)

## Critical Issues (빌드/런타임 블로커)

없음.

## Major Issues (기능 오동작)

없음.

## Minor Issues (디자인/문서 정확도)

| # | 위치 | 내용 | 권고 |
|---|------|------|------|
| M1 | `src/lib/exposure-engine.ts:42` 주석 | "EV ≈ 9.4" 라고 적혀 있으나 실제 계산은 `log2(0.18 * 100 * 100 / 12.5) = log2(144) ≈ 7.17` 임. CALIBRATION=100 그대로일 때 18% 그레이는 EV 7.17 이 산출됨. | 주석을 `EV ≈ 7.17 (전형적 실내 형광등/창가 광량)` 으로 정정. 공식 자체는 기능 정상이므로 코드 변경 불필요. |
| M2 | 7개 CSS module 파일 (`ComboPairs.module.css:55,97,262`, `MeasureButton.module.css:26`, `ZoneSystem.module.css:119`, `PresetPanel.module.css:33,98`) | `rgba(0, 255, 65, …)` 형태로 CLOVER_GREEN을 alpha 가변하여 직접 사용. `var(--green)` 의 alpha 변형이 CSS 변수만으로는 표현 어려움 (`color-mix()` 미사용). | 향후 `--green-glow-soft: rgba(0,255,65,0.08)` 같이 `:root` 에 alpha-step 토큰을 추가하거나 `color-mix(in srgb, var(--green) 8%, transparent)` 로 통일. 현재는 토큰 정신 위반이지만 동등 색상이라 시각 영향 없음. |
| M3 | `src/state/appState.tsx:321` | ESLint warning: `react-refresh/only-export-components` — `useAppState` hook 을 컴포넌트 파일에서 함께 export 함. | hook 을 `state/useAppState.ts` 로 분리하면 fast-refresh 가 더 부드럽게 작동. 빌드/런타임 영향 없음. |

## 체크리스트 상세

### 1. Worker Boundary: PASS

`src/workers/luminance.worker.ts` ↔ `src/types.ts` ↔ `src/App.tsx` & `src/lib/camera.ts` 교차 검증:

- [PASS] **postMessage shape vs WorkerResult**: worker 가 `ctx.postMessage(result)` 로 보내는 모든 키 (`type, ev, evRaw, zone, luminance, timestamp, pairs, iso, ec, priorityF, prioritySS, measuredAt, spot, error`) 가 `WorkerResult` 인터페이스 (types.ts:88-119) 에 모두 정의됨. `timestamp` 만 required, 나머지는 optional 로 type-narrowing 가능.
- [PASS] **onmessage handler type**: `camera.ts:81` 의 `worker.onmessage = (e: MessageEvent<WorkerResult>) => onMessage(e.data)` 가 강타입으로 받음. App.tsx 의 onMessage 콜백도 `WorkerResult` 시그니처로 4개 type (`error`, `ready`, `ev-update`, `spot-result`) 분기 처리.
- [PASS] **WorkerRequest coverage**: WorkerRequest 의 8개 type 값 (`start`, `stop`, `frame`, `set-iso`, `set-ec`, `set-focal`, `set-priority`, `sample-spot`) 모두 worker switch 에서 처리. `default` 절에 `const exhaustive: never = msg.type as never` exhaustive 체크 존재 — 새 type 추가 시 컴파일 오류 보장.
- [PASS] **luminance 필드명 일치**: worker → main 둘 다 `luminance` 단일 표기. `lum`/`luma` 혼용 없음.
- [PASS] **Transferable 사용**: `worker.postMessage(req, [bitmap])` 로 ImageBitmap 을 transferable 로 전달, GC 부하 최소화. worker 내부에서 `bitmap.close()` 정리.

### 2. EV Formula: PASS (with 주석 정정 권고)

`src/lib/exposure-engine.ts:50-65` 의 `luminanceToEV100` / `luminanceToEV` 검증:

| 입력 | 기대 방향 | 실제 출력 | 판정 |
|------|----------|----------|------|
| L=0.18, ISO=100, EC=0 | mid-gray 기준 EV | 7.17 (=log2(144)) | PASS — 사진학 표준 범위 내 (실내 광량) |
| L=0.36, ISO=100, EC=0 | +1 EV | 8.17 | PASS — luminance 2× → +1 EV |
| L=0.18, ISO=200, EC=0 | +1 EV | 8.17 | PASS — `Math.log2(200/100)=1` 가산 |
| L=0.18, ISO=100, EC=+1 | +1 EV | 8.17 | PASS — EC 직접 가산 |
| L=0 | -∞ 회피 | 0 (clamp) | PASS — `if (luminance <= 1e-6) return 0` |

- [PASS] ISO 보정 `Math.log2(iso / 100)` 존재 (line 63).
- [PASS] EC 가 EV 에 직접 더해짐 (line 64).
- [PASS] luminance ≤ 1e-6 division-by-zero 방지.
- [WARN] 주석 (line 42) 의 "EV ≈ 9.4" 는 7.17 로 정정 필요. 공식은 정상.

### 3. Design Tokens: PASS (with rgba alpha 권고)

```bash
grep -rn "#00FF41\|#000000\|#00CC33\|#00FF4133" src/components/ src/App.tsx src/App.module.css
# → 0 매치
```

- [PASS] 16진 색상 hex 가 컴포넌트 CSS/TSX 에 직접 사용된 경우 0건. `tokens.ts` + `index.css` (`:root`) 에서만 정의.
- [PASS] 모든 컴포넌트가 `var(--green)`, `var(--bg)`, `var(--gray-700)` 등 CSS 변수 사용.
- [PASS] `currentColor` 패턴 (GitHubLink SVG `fill="currentColor"`) 으로 `var(--white)` 상속.
- [WARN] `rgba(0, 255, 65, …)` 7건, `rgba(0, 0, 0, …)` 8건 — alpha 가변 hover/overlay 용이라 토큰화 가능 (M2 참조).

### 4. 44px Touch Target: PASS

- [PASS] 글로벌 안전망: `index.css:73-81` `button, [role='button'] { min-width: var(--touch-target); min-height: var(--touch-target); }`.
- [PASS] 다이얼 셀: `Dials.module.css:32,47` `min-height: var(--touch-target)`. `ScrollDial` `cellWidth=56` 기본값 (>44).
- [PASS] MEASURE 버튼: `MeasureButton.module.css:6` `min-height: 60px` (>44).
- [PASS] Spot Marker: `ZoneSystem.module.css:51` 56×56px (>44, pointer-events:none 이지만 시각 가독성).
- [PASS] Z-SYS Toggle: `ZoneSystem.module.css:101-102` `min-width/height: var(--touch-target)`.
- [PASS] Priority modal Select / Checkbox: 18px checkbox 자체는 작지만 `toggleLabel` 컨테이너가 `min-height: var(--touch-target)`.
- [PASS] GitHub 버튼: `GitHubLink.module.css:7-8` `width/height: var(--touch-target)` (44×44).
- [PASS] Preset slot/delete/action 버튼 모두 `min-height: var(--touch-target)`.
- 28px wide ZoneBar (`ZoneSystem.module.css:8`) 는 `pointer-events: none` 이라 터치 대상 아님 — 합법.

### 5. PWA Manifest: PASS

빌드 산출물 `dist/manifest.webmanifest` 검증 (vite.config.ts:14-29 와 일치):

| 필드 | 값 | 판정 |
|------|----|------|
| name | "AnalogMeter" | PASS |
| short_name | "AnalogMeter" | PASS |
| description | "전문 사진가를 위한 PWA 노출계" | PASS |
| start_url | "/analog-meter/" | PASS — base 경로 일치 |
| scope | "/analog-meter/" | PASS |
| display | "standalone" | PASS |
| background_color | "#000000" | PASS — BG_BLACK 일치 |
| theme_color | "#00FF41" | PASS — CLOVER_GREEN 일치, index.html `<meta name="theme-color">` 와 일치 |
| orientation | "portrait" | PASS |
| icons | 192×192 + 512×512 (any maskable) | PASS — public/ 에 두 파일 존재 |
| lang | "en" | PASS (한국어 strings 가 main 에 있으나 manifest lang 은 영어로 fallback) |

### 6. GH Actions: PASS

`.github/workflows/deploy.yml` 검증:

- [PASS] `on.push.branches: [main]` + PR trigger.
- [PASS] `permissions: pages: write, id-token: write, contents: read`.
- [PASS] `concurrency: group: pages, cancel-in-progress: false` — 무중단 배포 (PRD 4.2 준수).
- [PASS] build job: checkout → pnpm/action-setup@v4 → setup-node@v4 (cache:pnpm) → `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm build` → `actions/upload-pages-artifact@v3 path: dist`.
- [PASS] deploy job: `needs: build`, `if: github.ref == 'refs/heads/main'`, `actions/deploy-pages@v4`, environment github-pages.
- [PASS] lint 실패 → build 중단 → deploy 중단 (PRD 4.2 "검증 단계").

### 7. Build & Lint: PASS

```
pnpm build → ✓ built in 405ms (58 modules transformed)
  - dist/manifest.webmanifest (0.41 kB)
  - dist/assets/luminance.worker-*.js (4.01 kB)  // Worker 별도 청크 분리 확인
  - dist/assets/index-*.js (173.49 kB / gzip 55.05 kB)
  - PWA precache 15 entries (189.92 KiB)
pnpm lint → ✖ 1 problem (0 errors, 1 warning) — appState.tsx fast-refresh 한정 경고
```

### 8. PRD 기능 매핑: PASS (10/10)

| PRD 항목 | 구현 위치 | 판정 |
|----------|----------|------|
| §2.1 라이브 뷰 + 가이드 박스 (zoom 연동) | `CameraPreview.tsx:65-69` `boxPct = 100/clampedZoom` | PASS |
| §2.1 Z-SYS Toggle | `ZSysToggle.tsx` | PASS |
| §2.1 Zone Bar III~VII 무채색 그라데이션 | `tokens.ts:73-92` ZONE_GRADIENT_STEPS + `ZoneBar.tsx:14-15` `BAR_MIN=3, BAR_MAX=7` | PASS |
| §2.1 Spot Meter (탭 시 원형 인디케이터) | `SpotMeter.tsx` + worker `sample-spot` → `spot-result` | PASS |
| §2.1 가이드 박스 상단 EV 표시 | `CameraPreview.tsx:90-92` `<span className={evLabel}>EV {ev.toFixed(1)}</span>` | PASS |
| §2.2 ComboPairs 리스트 | `ComboPairsList.tsx` + worker `generateCombos` | PASS |
| §2.2 Priority 설정 오버레이 | `PrioritySettingsModal.tsx` | PASS |
| §2.2 F XOR SS → 글씨 초록 | `ComboPairs.module.css:88-91` `.pairOne { color: var(--green) }` | PASS |
| §2.2 F AND SS → 테두리 초록 | `ComboPairs.module.css:94-99` `.pairBoth { border-color: var(--green) }` | PASS |
| §2.3 MEASURE 대형 버튼 | `MeasureButton.tsx` + `min-height: 60px` | PASS |
| §2.3 초점 거리 5배 줌 | `tokens.ts:135` `FOCAL_ZOOM_MAX=5.0` + iPhone 15/16/17 Pro/Max Tetraprism 5x | PASS |
| §2.3 ISO 25 부터 1/3 스탑 | `tokens.ts:99-105` `ISO_VALUES[0]=25` 31단계 | PASS |
| §2.3 EC ±3 (1/3 스탑) | `tokens.ts:108-112` `EC_VALUES` -3.0 ~ +3.0 19단계 | PASS |
| §2.3 SAVE/LOAD PRESETS | `PresetPanel.tsx` + localStorage `analog-meter:presets` | PASS |
| §2.3 GitHub 버튼 흰색 로고 | `GitHubLink.tsx` SVG `fill="currentColor"` + `GitHubLink.module.css:13` `color: var(--white)` | PASS |
| §3.1 Device DB iPhone 13~17 + Galaxy S22~S26 | `devices.ts` DEVICE_DB 21 entries | PASS |
| §3.2 ISO 25~25600 | `ISO_VALUES` PASS |
| §3.2 조리개 f/1.2~f/22 (1/3) | `F_STOP_VALUES` 26단계 | PASS |
| §3.2 셔터 30s~1/8000s | `SHUTTER_VALUES` 55단계 | PASS |
| §3.3 Web Worker + OffscreenCanvas | `luminance.worker.ts:48,121-135` `new OffscreenCanvas` | PASS |
| §3.3 더블탭 줌 방지 | `index.html:6` viewport `maximum-scale=1.0, user-scalable=no` + `index.css:42-43` 전역 `touch-action: manipulation` | PASS |
| §4.2 Upload-pages-artifact + Deploy-pages | `deploy.yml:34-47` `@v3 / @v4` | PASS |
| §4.2 무중단 배포 | `concurrency.cancel-in-progress: false` | PASS |
| §5 BG #000000 + Clover Green #00FF41 | `tokens.ts:9-10` BG_BLACK, CLOVER_GREEN | PASS |
| §5 모바일 터치 타겟 44×44 | 글로벌 button 규칙 + `--touch-target: 44px` | PASS |
| §5 PWA Standalone | manifest `display: standalone` + iOS `apple-mobile-web-app-capable` | PASS |

## 최종 판정

**STATUS: PASS — 배포 가능**

코드 정합성, 타입 안전, PWA 사양, CI/CD 파이프라인, 디자인 시스템, PRD 기능 매핑이 모두 충족되었다. Minor 권고 3건은 후속 PR 로 분리 처리해도 무방.
