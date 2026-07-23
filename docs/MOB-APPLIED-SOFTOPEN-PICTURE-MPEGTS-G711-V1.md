# MOB-APPLIED: mob-softopen-picture-mpegts-g711-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**Genre:** Soft Open picture (Player error with ZLM `media presence online:true`)

## Mandate

Fix Soft Open **Player error** / no picture when SIP + ZLM media are already OK.

## Root cause

Lab WVP tiles already PASS with mpegts `hasAudio: false` (BWC FLV carries **G.711**; MSE cannot decode it → mpegts ERROR). Soft Open soft overlay did **not** set that — default demux tried audio → Player error.

Also: Soft Open used hard `muted=true` (lab tile learned Chromium can stall live FLV); stash buffer left on.

## What changed

| Piece | Change |
|-------|--------|
| `public/js/live-player-factory.js` | Soft overlay: `hasAudio: false`, `hasVideo: true`; stash off; micro-volume (nomute); ws→direct→proxy chain; log mpegts err detail |
| `lib/livePlaybackBroker.js` | Pass `wvp.wsFlv` into descriptor for Soft Open chain |
| `public/index.html` | Cache bust `live-player-factory.js?v=20260717-softopen-g711` |

No auto-stop / BYE change. Stop bridge unchanged.

## Pass / fail (Chin · GB+YDT OK)

1. Hard refresh once (UI only — Fleet restart not required).
2. Soft Open **Chin**.

| Pass | Fail |
|------|------|
| Wall shows live picture (status Live) | Still **Player error** / black |
| Console may show `[me8-zlm] soft play …` without mpegts MediaError on audio | mpegts still errors |

If FAIL: copy console `[me8-zlm] mpegts error …` line.

## One line

**Soft Open mpegts = lab tile: no G.711 audio track.**
