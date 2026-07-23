# MOB APPLIED — PIN-FLV-MIRROR-HARDEN-V1

**Date:** 2026-07-20  
**Status:** APPLIED — operator **FAIL** (layout jump) 2026-07-20  
**Scope:** `public/js/video-wall.js`, `public/index.html` (cache bust)  
**Parent:** `WVP-HANDOFF-PIN-MIRROR-FROM-VIDEO-V1` (extend / harden)  
**Follow-up disc:** `MOB-DISC-PIN-JUMP-FAIL-LAYOUT-RULES-PLAYER-ONLY-20260720.md`

---

## Goal

Map pin shows the same Live picture as the wall FLV panel — not stuck on “Live streaming…” / black. Still **one stream** (mirror wall `<video>`, no second FLV on pin).

---

## Changes

| Piece | Change |
|-------|--------|
| `wallMirrorSourceForCam` | Prefer handoff `<video>` first; canvas only for classic JSMpeg |
| `wallHandoffVideoForCam` | Find video by cam bind (not only `players.has`) |
| `startMapMirrorFromWall` | Re-resolve source each RAF; wait if wall FLV still coming; don’t die on stale video node |
| `attachMapPopupPlayer` | Under handoff: mirror path only — **no** pin JSMpeg fallback |
| `schedulePinFlvMirrorChase` | Short retries while pin open and wall FLV live but pin not painted yet |
| Cache | `video-wall.js?v=20260720-pin-flv-mirror-harden-v1` |

---

## Operator test (no bat)

1. Hard refresh desk once (Ctrl+Shift+R).
2. Soft Open / play — wall panel picture Live.
3. Open that BWC **map pin**.

| PASS | FAIL |
|------|------|
| Pin shows same picture as wall | Pin black / “Live streaming…” stuck |
| No second mpegts storm on pin | Pin opens own FLV player |

---

## Next after PASS

Phase **7:** `MOB-APPLY PIN-FOCUSED-OPEN-V1` (layout / auto-pin storm)
