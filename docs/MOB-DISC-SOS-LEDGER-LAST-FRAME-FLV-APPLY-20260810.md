# MOB DISC — APPLY SOS-LEDGER-LAST-FRAME-FLV-V1 — 2026-08-10

**Status:** APPLIED.  
**Files:** `public/js/video-wall.js` (capture helpers) + `public/index.html` (re-stash + cache bust).  
**Not touched:** stop-video, DeviceControl, mute, Firmware Gold pin attach cores.

## Change

- `liveFramePreviewDataUrl` / `captureLiveFrameForCam`: sample WVP wall `<video>` (and pin video) via temp canvas when no JSMpeg canvas.
- Reject tiny/blank JPEGs (`dataUrl.length <= 4000`).
- SOS raise: re-stash at 800ms + 2000ms after live starts.

## PASS

Hard refresh → SOS → wait for live picture → Ack (include snapshot on) → ledger thumb is a real frame, not white / empty. `snapshot.jpg` on disk ≫ 1KB.
