# MOB-APPLIED: mob-softopen-kill-reopen-storm-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**Prior discs:** stall/no-reopen-storm; 1h soak (broker re-fetch every few minutes)

## Mandate

Stop Soft Open from brute-forcing stalls via dashboard `fetchDescriptorPreferZlm` / UI reopen. Survive jitter with **same-URL mpegts recover** + honest buffering OSD; no pin/panel rebuild storm.

## What changed

| Piece | Change |
|-------|--------|
| `live-player-factory.js` | `sameUrlRecover`: stall/error after prove → destroy mpegts only, keep `<video>` last frame, reload **same** FLV URL (max 8); `onBuffering` / `onRecoverExhausted` |
| Soft Open wall | `sameUrlRecover: true`; **`autoReopen: false`** — removed `scheduleSoftOpenReopen` broker loop |
| Buffering OSD | Status + light overlay: **Weak Signal - Buffering…** over last frame |
| Exhausted | Signal-lost chrome + **Weak Signal**; keep session (no BYE / no new Soft Open) |
| Soft-upgrade path | Unchanged (no sameUrlRecover) |
| Cache | `?v=20260717-kill-reopen-storm` on factory + video-wall |

## Still forbidden

- Gate-B `liveBufferLatencyChasing` stash recipe  
- Broker re-fetch every N minutes as Soft Open “keepalive”

## Pass / fail

1. Hard refresh once.  
2. Soft Open Chin (+ KK).  
3. Soak; if stall, watch console for `[me8-zlm] same-url recover` — **not** repeated `live broker wvp-zlm primary` every few minutes without a new Soft Open click.

| Pass | Fail |
|------|------|
| Brief **Weak Signal - Buffering…** then Live again | Panel **Reconnecting…** + new `wvp-zlm primary` storm |
| No pin popup fan jump on recover | Pin jumps / rebuilds |
| Exhausted → Weak Signal OSD, cam not BYE’d | Soft Open torn down / stopPlay without operator Stop |

## One line

**Soft Open stall = same-URL mpegts recover + buffering OSD; broker reopen storm killed.**
