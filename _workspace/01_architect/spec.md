# Architect Spec — AnalogMeter PWA

## 핵심 요구사항 (PRD에서 추출)

### 1. UI 레이아웃 (PRD 2)
- **세로형 PWA**, 반응형, 3분할 (Top/Center/Bottom).
- **상단 (고정):** Camera live preview + Guide Box (focal에 연동) + Z-SYS 토글 + Zone Bar (III~VII 무채색 그라데이션) + Spot Meter (탭) + EV 라이브 표시.
- **중단 (가변):** Combination Pairs 리스트, 하이라이트 로직 (F만/SS만 만족 → 초록 글씨, 둘 다 만족 → 초록 테두리).
- **하단 (고정):** MEASURE 버튼 + Focal/ISO/EC 다이얼 (1/3 스탑 스냅) + Preset 섹션 + GitHub 버튼 (흰색 로고).

### 2. 기능 (PRD 3)
- Device DB: iPhone 13~17, Galaxy S22~S26 (35mm 환산 + 고정 조리개 + 센서).
- ISO 25 ~ 12800+ (1/3 스탑).
- 조리개 f/1.2 ~ f/22 (1/3 스탑).
- 셔터 30s ~ 1/8000s (출력 전용).
- EC -3 ~ +3 (1/3 스탑).
- Web Worker 픽셀 휘도 분석 → 60fps UI 보장.
- OffscreenCanvas 사용.
- `touch-action: manipulation` + viewport 메타로 더블탭 줌 차단.

### 3. 배포 (PRD 4)
- main 브랜치 → PR → merge.
- gh-pages는 Actions가 자동 관리.
- `.github/workflows/deploy.yml`: lint → build → upload-pages-artifact → deploy-pages.
- Artifact 기반 배포로 무중단 보장.

### 4. 디자인 (PRD 5)
- 배경 #000000 (BG_BLACK).
- 액센트 #00FF41 (CLOVER_GREEN).
- 모든 터치 타겟 ≥ 44x44px.
- PWA Standalone.

## 아키텍처 결정

### 모노 모듈 + Web Worker 분리
- 메인 스레드는 React 18로 60fps 렌더링.
- Worker (`src/workers/`)는 OffscreenCanvas로 카메라 프레임 → 루미넌스 → EV → ComboPair 계산.
- 메인 ↔ Worker 메시지는 `WorkerRequest` / `WorkerResult` (= `WorkerMessageIn` / `WorkerMessageOut`) 타입으로 강하게 타입화.

### Vite 5 + vite-plugin-pwa
- `base: '/analog-meter/'` — GitHub Pages user-repo 경로.
- Workbox autoUpdate, manifest theme/background는 디자인 토큰과 동기화.
- worker.format='es' — 모듈 워커 사용.

### TypeScript Project References
- `tsconfig.json` (root) → `tsconfig.app.json` + `tsconfig.node.json` 분리.
- WebWorker lib을 app tsconfig에 포함하여 `OffscreenCanvas`/`postMessage` 타입 사용 가능.

### 디자인 토큰 강제
- `src/tokens.ts`만이 색/사이즈의 단일 출처 (single source of truth).
- qa-inspector가 하드코딩된 #000000/#00FF41/`44`를 스캔하여 검증.

## 파일 트리 (스캐폴딩 후)

```
analog-meter/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── public/
│   ├── apple-touch-icon.png   (180x180 placeholder)
│   ├── favicon.ico
│   ├── pwa-192x192.png        (placeholder)
│   ├── pwa-512x512.png        (placeholder)
│   └── vite.svg
├── src/
│   ├── components/            (ui-engineer 채움)
│   ├── lib/                   (engine-engineer 채움 — exposure 계산 등)
│   ├── workers/               (engine-engineer 채움 — worker.ts)
│   ├── App.tsx                (껍데기, ui-engineer 교체)
│   ├── index.css              (글로벌 — touch-action, 배경, 터치 타겟)
│   ├── main.tsx               (엔트리)
│   ├── tokens.ts              ← 디자인 토큰 (architect 산출)
│   └── types.ts               ← 공유 타입 계약 (architect 산출)
├── .gitignore
├── eslint.config.js
├── index.html                 (viewport 더블탭 줌 방지)
├── package.json
├── tsconfig.app.json
├── tsconfig.json              (project references)
├── tsconfig.node.json
└── vite.config.ts             (PWA + worker es)
```

## Phase 2 인계 사항

- engine-engineer는 `src/types.ts`의 `WorkerMessageIn/Out`, `EVResult`, `ComboPair`, `Device`, `ZoneIndex`를 import해서 worker를 작성한다.
- ui-engineer는 같은 타입 + `src/tokens.ts`의 `COLORS`, `SPACING`, `ZONES`, `ISO_VALUES`, `EC_VALUES`, `F_STOP_VALUES`, `SHUTTER_VALUES`를 사용한다.
- 색/사이즈를 tokens.ts 외부에서 하드코딩하지 말 것 (qa-inspector 검사 대상).
