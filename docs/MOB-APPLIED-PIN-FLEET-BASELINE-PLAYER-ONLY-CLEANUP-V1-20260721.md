# MOB-APPLIED — PIN-FLEET-BASELINE-PLAYER-ONLY-CLEANUP-V1

**Date:** 2026-07-21  
**APPLY:** `MOB-APPLY PIN-FLEET-BASELINE-PLAYER-ONLY-CLEANUP-V1`  
**Disc:** `docs/MOB-DISC-WHAT-TO-APPLY-PIN-CLEANUP-20260721.md`

## Intent

One rule again: **Fleet classic pin UX + Call** + **WVP paint only**. Remove post-graft inventons.

## What changed

### `public/js/video-wall.js`

| Restored from classic-pass | Kept (WVP player only) |
|----------------------------|-------------------------|
| `playOnMapPopup` (SHA match classic) | `wallHandoffVideoForCam` / `wallMirrorSourceForCam` |
| `focusMapPinQuiet` (SHA match classic) | `startMapMirrorFromWall` draws canvas **or** `<video.me8-zlm-primary>` |
| `toggleVoiceCall` (SHA match classic) — **Call baseline** | `attachWvpHandoffFlv*` |
| `attachMapPopupPlayer` classic body; mirror gate → `wallMirrorSourceForCam` | onProven → `syncMapPopupPlayer` |

**Removed scars:** `wvpVideoHandoffUi`, `isWvpVideoHandoffMode`, `startWallLiveForPinCam`, `enterPinWaitForWallMirror`, PIN-CLICK-STARTS-WALL inventon branches.

### `public/index.html`

| Restored from classic-pass |
|----------------------------|
| Marker `click` / `popupopen` / `afterMarkerPopupReady` dock + play pattern (undo NO-DOCK-STORM inventon) |

Cache: `video-wall.js?v=20260721-pin-fleet-baseline-player-only-cleanup-v1`

## Not touched

- Fit pins algorithm rewrite  
- Tactical / vuln / Evidence  
- Hardcoded Chin/kk  

## Operator check

1. Right-click `RESTART-FLEET.bat` → Run as administrator → Yes.  
2. Hard refresh (`Ctrl+Shift+R`).  
3. Wall Idle → click one pin only.  
4. Try **Call** on that pin.

| PASS | FAIL |
|------|------|
| Picture + Call works (Fleet baseline) | Say: no video / Call dead / jump |
