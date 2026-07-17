# MOB-APPLIED: mob-ui-ghost-pin-cleanup-v1

**Date:** 2026-07-17  
**Status:** APPLIED (Soft Open UI / FLV / Stop pack — MOB 2/3)  
**Prior:** `mob-wvp-zlm-flv-player-error-v1` — operator **FAIL** (picture still black; Chin only online; KK offline expected)  
**Next (wait for APPLY):** `mob-wvp-softopen-stop-bridge-v1`

## Mandate

Remove the **dark empty rectangle** behind the map pin when Soft Open / player fails or Stop live on pin.

## What changed

| Piece | Change |
|-------|--------|
| `public/js/video-wall.js` | `cleanupGhostLiveChrome` — destroy soft ZLM overlay, streaming label, live CSS classes; restore placeholder; optional minimize + clear invite |
| Soft Open fail | `softOpenPlayerFailed` on no-desc / mpegts fail / catch — clears pin ghost + wall black stage (Soft Open has no JSMpeg under) |
| `destroyMapPlayer` / stop pin / popup close | Also strip `.me8-zlm-soft-overlay` + `.map-pin-streaming-label` |
| `destroyPlayer` | Always clear `activeStreams` (Soft Open never set JSMpeg `players`) |
| `public/index.html` | Cache bust `video-wall.js?v=20260717-ghost-pin-cleanup` |

## Pass / fail (operator — Chin only)

1. Hard refresh once (Fleet already running is fine for this UI-only MOB).
2. Soft Open **Chin** (expect Player error still until FLV MOB is reworked — this MOB is ghost only).
3. Watch the **map pin**.

| Pass | Fail |
|------|------|
| After Player error: dark pin video box / “Live streaming…” chrome **gone** (pin minimized or placeholder only) | Empty black rectangle stays behind pin |
| Pin **Stop live**: same — no leftover black patch | Black patch remains after stop |

## Note

Does **not** fix picture (MOB 1 still FAIL). Does **not** send WVP BYE (MOB 3). KK offline = skip.

## One line

**Player fail / pin stop → tear down pin black ghost chrome.**
