# MOB-APPLIED — FLV wall lifecycle parity

**Date:** 2026-07-20  
**MOB:** `MOB-APPLY-FLV-WALL-LIFECYCLE-PARITY-V1`  
**Scope:** `public/js/video-wall.js`, `public/js/live-player-factory.js`, `public/index.html` (cache bust).  
**Operator test:** pending.

---

## Problem

With `FM_WVP_VIDEO_HANDOFF=1`, ops wall paints via handoff FLV (`video.me8-zlm-primary`) — no JSMpeg canvas. Stop / signal-lost / stall-watch / `device_bye` chrome all gated on `stage.querySelector('canvas')`, so they **no-op** on FLV wall slots.

---

## Change

| Piece | Change |
|-------|--------|
| `wallStageHasLiveMedia(stage)` | True when stage has JSMpeg canvas **or** `video.me8-zlm-primary` |
| `pinHostHasLiveMedia(pinHost, camId)` | True for direct pin canvas, mirror canvas, or active mirror |
| `camHasActiveLiveVideoSurface` | Uses helpers above instead of canvas-only |
| `markBwcStoppedOverlay` | Applies Stopped-by-BWC overlay when FLV video is live |
| `markVideoSignalLost` | Same for signal-lost overlay |
| `attachFlvPrimary` | New `onVideoFrame` opt — `timeupdate` after prove ticks stall clock |
| `attachWvpHandoffFlvToWallSlot` | Wires `onVideoFrame` → `noteVideoFrame(camId)` |

Classic JSMpeg canvas path **unchanged** — helpers accept both media kinds.

`detachWallPlayerKeepCanvas` already calls `player.destroy()`; FLV handle removes `<video>` on destroy.

---

## Cache bust

`index.html`:

- `live-player-factory.js?v=20260720-flv-wall-lifecycle-parity-v1`
- `video-wall.js?v=20260720-flv-wall-lifecycle-parity-v1`

---

## Operator test

1. Hard refresh (Ctrl+Shift+R).
2. Confirm `FM_WVP_VIDEO_HANDOFF=1` (handoff on).
3. Open one BWC live on ops wall — picture proves.
4. **BWC stop** on device → wall shows **Stopped by BWC** (not frozen last frame).
5. Re-open live, cover lens / kill RTP ~3s → stall watch → **Stopped by BWC** (or signal path if offline).
6. Operator **Stop** on dashboard still tears down normally.
7. Optional: `FM_WVP_VIDEO_HANDOFF=0` → classic canvas — same stop/signal behavior as before.

---

## Next (locked order)

`FR-LIVE-WATCH-FLV-HANDOFF-V1` — FR live watch tiles still JSMpeg-only under handoff.

**Parked (voice — not done):** BWC→BWC group PTT relay, Call/intercom WVP-homed, `WVP-REBOOT-BRINGUP-ONE-BAT-V1`.
