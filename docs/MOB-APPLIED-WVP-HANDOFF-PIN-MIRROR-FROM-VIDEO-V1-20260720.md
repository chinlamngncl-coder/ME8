# MOB-APPLIED — WVP handoff pin mirror from wall video

**Date:** 2026-07-20  
**MOB:** `MOB-APPLY-WVP-HANDOFF-PIN-MIRROR-FROM-VIDEO-V1`  
**Scope:** `public/js/video-wall.js` only (pin mirror path).  
**Operator PASS:** 2026-07-20 ~16:29 — pin shows same picture as wall panel.

---

## Problem

After `MOB-APPLY-MPEGTS-AUDIO-DROP-AND-MUTED`, wall panels paint via handoff FLV (`video.me8-zlm-primary`). Map pin stayed **“Live streaming…”** black because Firmware Gold mirror only copied wall **JSMpeg canvas** — handoff has no canvas.

---

## Change

| Piece | Change |
|-------|--------|
| `wallHandoffVideoForCam()` | Finds `video.me8-zlm-primary` on wall slot for cam |
| `wallMirrorSourceForCam()` | Canvas first (classic/Firmware Gold); else decoded handoff `<video>` |
| `startMapMirrorFromWall()` | RAF `drawImage` from canvas **or** video (`videoWidth`/`videoHeight`) |
| `attachMapPopupPlayer()` | Mirror when `wallMirrorSourceForCam(camId)` — not canvas-only |

Classic JSMpeg canvas mirror **unchanged** when canvas exists.

Handoff `onProven` already calls `syncMapPopupPlayer(camId)` — pin picks up mirror after wall proves.

---

## Cache bust

`index.html`: `video-wall.js?v=20260720-handoff-pin-mirror-v1`

---

## Operator test

1. Hard refresh (Ctrl+Shift+R).
2. Open Chin live (wall picture already PASS).
3. Open / focus **Chin map pin**.

| Pass | Fail |
|------|------|
| Pin shows same picture as wall panel | Pin stuck “Live streaming…” / black |
| No second FLV player on pin | Pin opens its own mpegts / proxy storm |

**Result:** **PASS** (operator confirmed).

Panel 5 duplicate (poll) — still by design, not this MOB.

---

## Not touched

- Jul 19 panel sizing (separate MOB)
- PTT / Call / SOS
- Backend handoff / proxy / token
