# MOB APPLIED — WVP-HANDOFF-STOP-UI-PARITY-V1

**Date:** 2026-07-23  
**APPLY:** `MOB-APPLY WVP-HANDOFF-STOP-UI-PARITY-V1`  
**Disc:** `MOB-DISC-BRING-BACK-STOP-SIGNAL-FLEET-CHROME-20260723.md`  
**Status:** **PASS** (operator 2026-07-23)

---

## Problem

Under `FM_WVP_VIDEO_HANDOFF=1`, **Stopped by BWC** / **Video signal lost** chrome went dark even though lifecycle parity overlays still existed.

Root causes found:

1. Stall watch **skipped entirely** when handoff UI + ops wall claimed the cam (`wvpVideoHandoffUi && opsWallClaimsCam` early return).  
2. FLV player **ERROR after prove** was ignored (`settled` blocked `fail()` / no `onStreamLost`).  
3. WVP hard-stop had no Socket.IO hook for future `device_bye` (operator path already emits `operator_stop`).

---

## Changes

| File | Change |
|------|--------|
| `public/js/video-wall.js` | Removed handoff stall skip; FLV `onStreamLost` → `markBwcStoppedOverlay` |
| `public/js/live-player-factory.js` | Post-prove ERROR / `ended` → `onStreamLost` |
| `lib/wvpVideoHandoff.js` | `setStopUiNotify` + `stopPlay({ notifyUi: true })` opt (default off so operator soft-stop stays clean) |
| `server.js` | Wires notify → `io.emit('video-stream-stopped', { reason })` |
| `public/index.html` | Cache bust `?v=20260723-wvp-handoff-stop-ui-parity-v1` |

**Not changed:** WVP startPlay / INVITE / FLV attach URL path. Companion battery / Record toast stay parked.

---

## Operator smoke

1. Restart Node server.  
2. Hard refresh dashboard (Ctrl+Shift+R).  
3. Soft Open one cam → Live picture.  
4. **Stop video on BWC** (or cover lens / kill stream ~3s) → wall should show **Stopped by BWC** (not frozen Live).  
5. Soft Open again → Live OK.  
6. Optional: dashboard **Stop** still tears down cleanly (Idle), not false Stopped-by-BWC if you marked operator stop.

Say **PASS** or **FAIL** (and which step).

**Operator result:** **PASS** (2026-07-23).

---

## One line

**Stall works again on handoff wall; FLV death after Live paints Stopped by BWC; handoff can emit device_bye when notifyUi is set. PASS.**
