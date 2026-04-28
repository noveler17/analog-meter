# Worker API — postMessage Protocol

> 단일 진실 소스: `src/types.ts` (`WorkerRequest`, `WorkerResult`).
> 본 문서는 ui-engineer / qa-inspector 가 빠르게 참조하는 요약본.

## 메인 → Worker (`WorkerRequest`)

| type            | 추가 필드                                           |
|-----------------|-----------------------------------------------------|
| `start`         | `iso?, ec?, focalZoom?, priorityF?, prioritySS?`    |
| `stop`          | -                                                   |
| `frame`         | `frame: ImageBitmap` (transferable)                 |
| `set-iso`       | `iso`                                               |
| `set-ec`        | `ec`                                                |
| `set-focal`     | `focalZoom`                                         |
| `set-priority`  | `priorityF`, `prioritySS`                           |
| `sample-spot`   | `frame: ImageBitmap`, `spotX`, `spotY` (0~1)        |

전송 시: `worker.postMessage(req, [req.frame])` (있을 때만)

## Worker → 메인 (`WorkerResult`)

모든 메시지는 `timestamp: number` (performance.now()) 포함.

### `ready`
워커 부팅 완료. 다른 필드 없음.

### `ev-update` (30fps, EVResult 호환)
- `ev`, `evRaw` — ISO/EC 보정 후 / 100 기준
- `zone` — `0~10` (Zone V = 18% gray)
- `luminance` — 0~1
- `pairs` — `ComboPairHighlighted[]` (우선순위 적용 완료)
- `iso`, `ec`, `priorityF`, `prioritySS`, `measuredAt` — echo

### `spot-result`
- `spot: { zone, ev, x, y }`

### `error`
- `error: string`

## 사용 예 (메인 측)

```ts
import { startCamera } from './lib/camera'

const session = await startCamera({
  video: videoElement,
  onMessage: (msg) => {
    switch (msg.type) {
      case 'ready':     break
      case 'ev-update': /* setEV(msg.ev), setPairs(msg.pairs) */ break
      case 'spot-result': /* setSpot(msg.spot) */ break
      case 'error':     /* show toast */ break
    }
  },
  iso: 100, ec: 0,
})

// 다이얼 변경
session.send({ type: 'set-iso', iso: 400 })
// 탭 → spot meter
session.requestSpot(0.5, 0.4)
// cleanup
session.stop()
```

## 변경 시 동기화 대상

- `src/types.ts`
- `_workspace/01_architect/contracts.md` (Section C)
- 본 문서
- `_workspace/02_engine/notes.md`
