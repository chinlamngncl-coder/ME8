# MOB-APPLIED — Video matrix popout FLV handoff

**Date:** 2026-07-20  
**MOB:** `MOB-APPLY-VIDEO-MATRIX-POPOUT-FLV-HANDOFF-V1`  
**Scope:** `public/matrix.html`, `public/js/video-matrix.js`, `public/js/command-wall.js` (`getMatrixSlotVideo`), `public/index.html` (cache bust).  
**Operator test:** pending.

---

## Problem

Matrix popout (`matrix.html`) mirrored **canvas only** from the opener. With WVP handoff, ops wall and Command Wall use **`<video.me8-zlm-primary>`** — matrix showed “No live video on this panel” while parent had picture.

---

## Change

| Piece | Change |
|-------|--------|
| `VideoMatrix.getSlotLiveVideo` | Returns FLV `<video>` from ops slot or CW cell |
| `VideoMatrix.getSlotMirrorSource` | Canvas if present, else FLV video |
| `getSlotMatrixInfo.hasLive` | True when canvas **or** video |
| `CommandWall.getMatrixSlotVideo` | CW matrix path |
| `matrix.html` tick | `drawImage` from canvas **or** video (native resolution, no hardcoding) |
| Play / Stop / Audio | Unchanged — still delegate to opener |

No extra WVP viewer refs — mirror-only architecture preserved.

---

## Cache bust

- `index.html`: `video-matrix.js?v=20260720-matrix-flv-handoff-v1`
- `index.html`: `command-wall.js?v=20260720-matrix-flv-handoff-v1`

---

## Operator test

1. Hard refresh ops dashboard (Ctrl+Shift+R).
2. Handoff on (`FM_WVP_VIDEO_HANDOFF=1`).
3. Play 1–2 BWCs on ops wall (or Command Wall).
4. Video tools → **Matrix popout** → pick live panel(s) → Open.
5. **PASS:** Matrix window shows same picture(s) as parent (within ~1s RAF mirror).
6. Stop on matrix delegates to parent; parent stop clears matrix idle state.

---

## Next (locked order)

| Phase | MOB |
|-------|-----|
| 6 | `PIN-FLV-MIRROR-HARDEN-V1` |
