# MOB-APPLIED: mob-softopen-zlm-keepalive-reopen-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**Prior:** Dual Soft Open Chin+KK ~5 min; KK drop / Play-fail / signal-lost while BWC still lit (player/ZLM stall class)

## Mandate

Soft Open wall mpegts must keep alive and silently reopen after stall / player error (lab-tile pattern), instead of leaving a dead tile until Stop→Play.

## Pattern (lab tile)

| Knob | Value |
|------|-------|
| Keepalive tick | 15s |
| Stall (frozen `currentTime`) | 22s |
| Reopen gap | 8s |
| Max reopen | 12 |

## What changed

| Piece | Change |
|-------|--------|
| `public/js/live-player-factory.js` | After prove: keepalive + stall clock; mpegts error / stall → `onReopen` when `autoReopen: true` (not hard fail) |
| `public/js/video-wall.js` | Soft Open only: `autoReopen` + schedule re-`fetchDescriptorPreferZlm` + re-attach; budget 12×8s; Stop / player-fail clears budget |
| Soft-upgrade path | **Unchanged** — `scheduleWallZlmSoftUpgrade` has no `autoReopen` (fail-open to JSMpeg) |
| Cache | `live-player-factory.js?v=20260717-softopen-keepalive`, `video-wall.js?v=20260717-softopen-keepalive` |

## Out of scope

- Auto BYE / `emitOpsStopVideo` on player fail (still forbidden)
- Soft Open picture path stays WVP ZLM only
- Play-after-drop without Stop; OSD copy changes

## Pass / fail (operator)

1. Hard refresh once.  
2. Soft Open **Chin + kk** (dual).  
3. Soak **>10 min** (or until a natural stall would have killed KK before).

| Pass | Fail |
|------|------|
| Wall (+ pin mirror) stay live or brief **Reconnecting…** then picture returns | Dead tile / Play fail / signal-lost with no reopen |
| Console may show `[me8-softopen] reopen` / `[me8-zlm] soft reopen` | Immediate BYE / Soft Open torn down without Stop |
| Brief blink on reopen OK | Storm of reconnects / wall never recovers after 12 tries without Player error |

## One line

**Soft Open ZLM: keepalive 15s + stall 22s → silent reopen (8s gap, max 12); soft-upgrade path unchanged.**
