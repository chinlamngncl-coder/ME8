# MOB APPLIED — POPOUT-MATRIX-FLV-READY-ACCEPT-V1

**Date:** 2026-07-20  
**Status:** APPLIED — operator **PASS** 2026-07-20  
**Disc:** `MOB-DISC-AGENT-NO-STUPID-RESTART-WORDS-MATRIX-BLACK-20260720.md`  
**Parent:** `POPOUT-CLOSE-SAFE-V1` (Close stays safe; this restores picture)

---

## Goal

Matrix / panel popout show FLV again when parent wall is Live, without undoing Close-safe (`matrix-popout` / `live-popout` surfaces).

---

## Changes (page only — no server restart)

| File | Change |
|------|--------|
| `public/matrix.html` | Accept `ops` / `command-wall` / own surface on `video-stream-ready`; stronger opener FLV lookup; attach-fail → own `start-video` once (no reopen loop) |
| `public/live.html` | Same ready-accept + opener fallback + attach-fail → start |

Close / beforeunload still release **popout-only** refs. Stop ■ unchanged.

---

## Operator test (no bat)

1. Hard refresh main desk once (Ctrl+Shift+R).
2. Soft Open / play so panels are Live.
3. Open **matrix** → picture on those panels (not “No live video”).
4. **Close** matrix → parent wall + pin stay Live.
5. Optional: panel popout same Close + picture.

**Do not** run Lab Console Start / RESTART-FLEET for this MOB (HTML only).

---

## Next after PASS

Phase **6:** `MOB-APPLY PIN-FLV-MIRROR-HARDEN-V1`
