# Scaffold Log — AnalogMeter

## 환경
- 작업 디렉토리: `/Users/noveler17/workspace-private/analog-meter/`
- Node: v24.15.0 (nvm)
- pnpm: 10.33.2
- 일자: 2026-04-27

## 생성 파일 목록

### 빌드 인프라
| 경로                         | 내용                                                          |
| ---------------------------- | ------------------------------------------------------------- |
| `package.json`               | React 18, Vite 5, vite-plugin-pwa, eslint 9, tseslint 8       |
| `eslint.config.js`           | flat config, browser+worker globals, react-hooks/refresh      |
| `tsconfig.json`              | project references → app + node                               |
| `tsconfig.app.json`          | strict, jsx react-jsx, lib에 WebWorker 포함, vite-pwa types   |
| `tsconfig.node.json`         | vite.config.ts 전용                                           |
| `vite.config.ts`             | base=/analog-meter/, VitePWA(theme=#00FF41 / bg=#000000), worker.format='es' |
| `index.html`                 | viewport user-scalable=no + theme-color meta                  |
| `.gitignore`                 | node_modules, dist, dev-dist 등 표준                          |

### PWA 자산
| 경로                          | 내용                                  |
| ----------------------------- | ------------------------------------- |
| `public/pwa-192x192.png`      | placeholder 검정 PNG (192x192)        |
| `public/pwa-512x512.png`      | placeholder 검정 PNG (512x512)        |
| `public/apple-touch-icon.png` | placeholder 검정 PNG (180x180)        |
| `public/favicon.ico`          | placeholder                           |
| `public/vite.svg`             | 검정 배경 + 클로버 그린 원형 SVG 아이콘 |

### CI/CD
| 경로                              | 내용                                         |
| --------------------------------- | -------------------------------------------- |
| `.github/workflows/deploy.yml`    | pnpm install → lint → build → upload-pages-artifact → deploy-pages |

### React 셸
| 경로              | 내용                                                       |
| ----------------- | ---------------------------------------------------------- |
| `src/main.tsx`    | React 18 createRoot + StrictMode + index.css import        |
| `src/App.tsx`     | 빈 껍데기 (`<h1>AnalogMeter</h1>`) — ui-engineer가 교체    |
| `src/index.css`   | * touch-action:manipulation, html/body 검정 배경, button 44px 최소 |

### 공유 계약 (architect 핵심 산출물)
| 경로            | 내용                                                              |
| --------------- | ----------------------------------------------------------------- |
| `src/types.ts`  | Scalar aliases (ISO/EC/FStop/ShutterSpeed/EV/FocalZoom), Zone, ZoneReading, WorkerRequest/Result + WorkerMessageIn/Out, SpotResult, CameraLens/Device, ComboPair/ComboPairHighlighted, FRange/SSRange, EVResult, Preset, AppState |
| `src/tokens.ts` | BG_BLACK, CLOVER_GREEN, TOUCH_TARGET_MIN(44), COLORS, TYPOGRAPHY, SPACING, ZONE_GRADIENT_STEPS(11단계), ZONES, ISO_VALUES, EC_VALUES, F_STOP_VALUES, SHUTTER_VALUES, FOCAL_ZOOM_MIN/MAX, PERF |

### 문서
| 경로                                          | 내용                       |
| --------------------------------------------- | -------------------------- |
| `_workspace/01_architect/spec.md`             | PRD 요구사항 + 아키텍처 결정 |
| `_workspace/01_architect/contracts.md`        | 타입/토큰 카탈로그 (engine/ui 바인딩 참조용) |
| `_workspace/01_architect/scaffold-log.md`     | 본 문서                    |

## 명령 로그

```sh
# 1. 디렉토리 스캐폴딩
mkdir -p _workspace/01_architect src/components src/lib src/workers public .github/workflows

# 2. 모든 파일 Write 완료 후 의존성 설치
pnpm install
# → Done in 35.8s using pnpm v10.33.2
# → Packages: +450
# → 경고: deprecated 서브 의존성 3개 (glob@11, source-map@0.8.0-beta.0, sourcemap-codec@1.4.8) — 무시 가능
# → 경고: ETIMEDOUT 1회 발생 후 자동 재시도 성공
# → 경고: esbuild build script ignored (pnpm 10 기본동작; 보안상 안전, build/lint 정상)

# 3. 빌드 검증
pnpm build
# → tsc -b 통과
# → vite build 통과: 31 modules, 308ms
# → dist/manifest.webmanifest 생성 (theme=#00FF41, bg=#000000 확인)
# → dist/sw.js + workbox-*.js 생성 (precache 14 entries / 142.23 KiB)

# 4. Lint 검증
pnpm lint
# → 0 problems
```

## 검증 체크리스트

| 항목                                         | 상태 |
| -------------------------------------------- | ---- |
| `pnpm install` exit 0                        | OK   |
| `node_modules/` 생성됨                       | OK   |
| `pnpm build` exit 0                          | OK   |
| `pnpm lint` exit 0                           | OK   |
| `dist/manifest.webmanifest` 존재             | OK   |
| manifest.background_color === `#000000`      | OK   |
| manifest.theme_color === `#00FF41`           | OK   |
| `.github/workflows/deploy.yml` 존재          | OK   |
| `src/types.ts` 존재 + WorkerMessageIn/Out export | OK |
| `src/tokens.ts` 존재 + BG_BLACK/CLOVER_GREEN/TOUCH_TARGET_MIN export | OK |
| `_workspace/01_architect/contracts.md` 존재   | OK   |
| viewport 더블탭 줌 방지 메타 (`maximum-scale=1.0, user-scalable=no`) | OK |
| 글로벌 `touch-action: manipulation`          | OK   |

## 알려진 사항 / 인계

1. **placeholder PNG**: `public/pwa-{192,512}.png`는 검정 단색 placeholder. 디자인팀이 실제 아이콘으로 교체 가능.
2. **GitHub Pages 활성화 필요**: 저장소 Settings → Pages → Source = "GitHub Actions" 로 한 번 수동 설정해야 deploy.yml이 정상 동작.
3. **engine-engineer 작업 시**: `tsconfig.app.json`에 `"WebWorker"` lib을 추가해 두었으므로 `src/workers/*.ts`에서 `OffscreenCanvas`, `self.postMessage` 등이 타입 인식됨. ESLint도 worker globals 포함.
4. **Worker 모듈 형식**: vite.config.ts에 `worker.format: 'es'` 설정. 워커는 `new Worker(new URL('./workers/exposure.ts', import.meta.url), { type: 'module' })` 패턴으로 생성할 것.
5. **재실행 안전성**: 모든 Write는 idempotent. architect 재실행 시 동일 결과 보장.

## 실패/재시도 기록
없음. 1회 시도로 모든 검증 통과.
