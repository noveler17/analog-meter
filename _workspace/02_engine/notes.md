# Engine Engineer — Implementation Notes

## 0. 산출 파일

| 파일 | 역할 |
|---|---|
| `src/lib/exposure-engine.ts` | 순수 EV/Zone/Combo/Highlight/Average 함수 |
| `src/lib/devices.ts` | iPhone 13~17 + Galaxy S22~S26 Device DB |
| `src/lib/camera.ts` | getUserMedia + Worker 브리지 + rVFC 루프 |
| `src/workers/luminance.worker.ts` | OffscreenCanvas + 픽셀 분석 + EVResult 송신 |

## 1. 계약 변경 (architect 와 합의 필요 → contracts.md 갱신 완료)

`WorkerResult` 가 PRD 의 `EVResult.pairs` 를 메인에 전달하지 못하는 구조였다 (필드 부재).
바인딩 규칙 #3 ("EVResult.pairs 는 Worker 가 적용 후 송신") 을 만족시키기 위해 다음 필드를 `ev-update` 페이로드에 추가:

- `pairs?: ComboPairHighlighted[]` — 우선순위 하이라이트 적용 완료 상태
- `iso?, ec?, priorityF?, prioritySS?, measuredAt?` — UI 가 `EVResult` 를 그대로 store에 보관할 수 있도록 echo

`WorkerRequest.type` 에 `'frame'` 추가 — 매 프레임 카메라 비트맵을 보내는 명시적 채널 (이전엔 `'start'` 한 번만 frame 동봉 가능했음).

`src/types.ts` 와 `_workspace/01_architect/contracts.md` 양쪽에 동기화.

## 2. Worker postMessage shape — 샘플 JSON

### 메인 → Worker (`WorkerRequest`)

```json
// 시작
{ "type": "start", "iso": 100, "ec": 0, "focalZoom": 1.0, "priorityF": null, "prioritySS": null }

// 매 프레임 (ImageBitmap 은 transferable 로 동봉)
{ "type": "frame", "frame": "<ImageBitmap transferable>" }

// 다이얼 변경
{ "type": "set-iso", "iso": 400 }
{ "type": "set-ec",  "ec": -0.7 }
{ "type": "set-priority", "priorityF": [2.8, 5.6], "prioritySS": [0.004, 0.001] }

// Spot meter (탭 좌표 0~1 정규화)
{ "type": "sample-spot", "frame": "<ImageBitmap>", "spotX": 0.5, "spotY": 0.4 }

// 종료
{ "type": "stop" }
```

### Worker → 메인 (`WorkerResult`)

```json
// 워커 부팅 완료
{ "type": "ready", "timestamp": 12.345 }

// 30fps 라이브 EV 업데이트 (PERF.WORKER_INTERVAL_MS = 33.33ms)
{
  "type": "ev-update",
  "ev": 7.17,
  "evRaw": 7.17,
  "zone": 5,
  "luminance": 0.18,
  "timestamp": 1230.5,
  "iso": 100,
  "ec": 0,
  "priorityF": [2.8, 5.6],
  "prioritySS": [0.004, 0.001],
  "measuredAt": 1714200000000,
  "pairs": [
    { "aperture": 1.4, "apertureLabel": "f/1.4",
      "shutterSpeed": 0.00031, "shutterLabel": "1/3200",
      "matchF": false, "matchSS": false },
    { "aperture": 2.8, "apertureLabel": "f/2.8",
      "shutterSpeed": 0.00125, "shutterLabel": "1/800",
      "matchF": true, "matchSS": false }
    /* ... 전체 F_STOP_VALUES 중 셔터 한계 안에 들어오는 것 모두 ... */
  ]
}

// Spot meter 응답
{
  "type": "spot-result",
  "timestamp": 1500.0,
  "spot": { "zone": 7, "ev": 9.2, "x": 0.5, "y": 0.4 }
}

// 에러 (getImageData 실패, OffscreenCanvas 미지원 등)
{ "type": "error", "error": "OffscreenCanvas not supported in this Worker context", "timestamp": 1.0 }
```

> UI 는 `ev-update` 의 `pairs` 를 추가 가공 없이 그대로 렌더한다.
> `matchF XOR matchSS → 글씨 초록`, `matchF && matchSS → 테두리 초록`.

## 3. EV 공식 + 검증

### 공식

```
EV100   = log2(L * CALIBRATION * 100 / K)         // K = 12.5 (ISO 2720), CALIBRATION = 100
EV(ISO,EC) = EV100 + log2(ISO/100) + EC
shutter = aperture² / 2^EV                        // ComboPair 생성
zone    = round(5 + log2(L / 0.18))               // Zone V = 18% mid-gray, 1 EV = 1 Zone
```

### `K=12.5, CALIBRATION=100` 결정 근거

카메라 비디오 출력은 자동 노출/감마 보정으로 인해 절대 휘도 cd/m² 와 다르다.
정규화된 18% 그레이 (`L=0.18`) 가 일상 실내 광량에 부합하는 EV 7~8 영역에 들어오도록 `CALIBRATION = 100` 으로 튜닝.
기기별 추후 보정 가능하도록 `exposure-engine.ts` 상단 단일 상수로 노출.

### 손계산 검증 결과

| 입력 | 기대 거동 | 계산 결과 |
|---|---|---|
| L=0.18, ISO 100, EC 0 | mid-gray 기준 EV | **7.17** (전형 실내) |
| L=0.18, ISO 200, EC 0 | ISO +1 stop → +1 EV | **8.17** ✓ (+1.00) |
| L=0.18, ISO 100, EC -1 | EC -1 → -1 EV | **6.17** ✓ (-1.00) |
| L=0.50, ISO 100 | 밝은 회색 (≈+1.5 EV) | **8.64** ✓ |
| L=0.05, ISO 100 | 어두운 그림자 (≈-1.8 EV) | **5.32** ✓ |
| EV 8, f/2.8 | t = 2.8²/256 = 1/32.6s → snap 1/30 | **0.0306s ≈ 1/33** ✓ |
| EV 8, f/8 | t = 64/256 = 0.25s = 1/4 | **0.250s ✓** |
| EV 8, f/16 | t = 256/256 = 1s | **1.000s ✓** |

EV → Zone 맵핑 (`classifyZone`):
- L=0.18 → log2(1) = 0 → Zone 5 ✓
- L=0.36 → log2(2) = 1 → Zone 6 ✓
- L=0.09 → log2(0.5) = -1 → Zone 4 ✓
- L=0.0 → 클램프 → Zone 0

## 4. 1/3 스탑 시리즈 (`src/tokens.ts` 참조 — 단일 소스)

| 시리즈 | 첫 5개 | 마지막 5개 |
|---|---|---|
| `ISO_VALUES` (31개) | 25, 32, 40, 50, 64 | 12800, 16000, 20000, 25600 (총 31 → 마지막 4) |
| `EC_VALUES` (19개) | -3.0, -2.7, -2.3, -2.0, -1.7 | 1.7, 2.0, 2.3, 2.7, 3.0 |
| `F_STOP_VALUES` (26개) | 1.2, 1.4, 1.6, 1.8, 2.0 | 16, 18, 20, 22 (총 26 → 마지막 4) |
| `SHUTTER_VALUES` (55개, 초 단위) | 30, 25, 20, 15, 13 | 1/4000, 1/5000, 1/6400, 1/8000 (마지막 4) |

> Engine 코드 어디에서도 위 배열을 자체 정의하지 않는다 — 전부 `from '../tokens'` import.
> 스킬(`exposure-engine` SKILL.md)에 적힌 ISO_STOPS(12800까지)·SHUTTER_STOPS 배열은 토큰과 다르므로 사용하지 않음. 토큰이 진실 소스.

## 5. Worker 아키텍처 결정

- **OffscreenCanvas 는 워커 내부에서 lazy 생성** (`new OffscreenCanvas(w,h)`).
  메인은 canvas 를 transfer 하지 않는다 (스킬 예제와 다름) — 계약 #4 "frame 은 ImageBitmap 으로만 전달" 준수.
- **`requestVideoFrameCallback`** 메인 스레드 펌프 + Worker 자체 송신 throttle 의 이중 throttle.
  rVFC 미지원 환경(Safari < 16 등) 은 `setInterval(WORKER_INTERVAL_MS)` 폴백.
- 전송된 ImageBitmap 은 사용 직후 `bitmap.close()` 로 GPU 자원 즉시 해제.
- 워커 내부엔 `setTimeout(loop)` 없음 — 메시지 도착 시점에만 작업.

## 6. UI 협업 노트

- ui-engineer 가 `WorkerResult` 를 그대로 React state 에 보관할 수 있도록 EVResult-호환 페이로드 송신.
- `pairs` 가 도착하지 않은 초기 1프레임 동안 UI 는 빈 리스트 처리.
- `error` 메시지는 toast / banner 로 노출 권장 (특히 카메라 권한 거부).
- spot tap 이벤트 → `cameraSession.requestSpot(nx, ny)` 한 줄 호출.

## 7. 검증 명령

```bash
pnpm build   # tsc -b && vite build → 통과 (142.5 KiB / 45.7 KiB gz)
```

Status: **module-complete: engine** (qa-inspector 인계 가능).
