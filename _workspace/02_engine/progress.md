# Engine — Progress

- [x] contracts.md 읽고 EVResult 갭 발견 → types.ts + contracts.md 양쪽 보강
- [x] `src/lib/exposure-engine.ts` (순수 함수)
- [x] `src/lib/devices.ts` (iPhone 13~17 Pro/Max 포함, Galaxy S22~S26 + Ultra)
- [x] `src/workers/luminance.worker.ts` (OffscreenCanvas, 30fps throttle)
- [x] `src/lib/camera.ts` (getUserMedia + rVFC + transferable bitmap)
- [x] `pnpm build` 통과 (TypeScript strict + vite + PWA)
- [x] EV 손계산 검증 (mid-gray = EV 7.17, ISO/EC 가산 정확)
- [x] notes.md / worker-api.md 작성

## 완료 신호

- → ui-engineer: WorkerResult 가 EVResult-호환 (`pairs`, `iso`, `ec`, `priorityF`, `prioritySS`, `measuredAt` 포함). UI 는 그대로 store 에 보관 가능.
- → qa-inspector: module-complete: engine (notes.md / worker-api.md 참조).
