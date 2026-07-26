# MOB DISC — Tactical draw: delete stuck + clearer zone rows

**Date:** 2026-07-24  
**Status:** **APPLIED** — see `MOB-APPLIED-TACTICAL-DRAW-DELETE-LIST-UX-V1-20260724.md`  
**Parent:** `MOB-APPLIED-TACTICAL-LEAFLET-DRAW-V1-20260724.md`  
**Operator report:** Delete stays on **Deleting** (feels stuck). Zone line `123 · polygon` is too quiet / not obvious.

---

## What is going wrong (simple English)

### 1. Delete feels stuck

Today’s flow (hidden from the operator):

1. Tap **Delete** → status **Deleting**, button turns blue (armed).  
2. Click the shape on the map.  
3. Tap **Delete again** to finish → only then it commits.

If you stop after step 1–2, status stays **Deleting** forever. That matches the screenshot.  
There is also **no “Deleted”** status — finish currently sets **Saved**, which is wrong for delete.

**Operator expectation (correct):** after a zone is removed, status should say **Deleted**, list row gone, Delete button not stuck blue.

### 2. Zone list not obvious

Current row: small muted `123 · polygon` — Incident ID and type look the same; easy to miss.

---

## Agent recommendation (one path)

**Next APPLY name:** `TACTICAL-DRAW-DELETE-LIST-UX-V1`

| Fix | Detail |
|-----|--------|
| Delete | **One-shot:** tap Delete → click shape → remove **immediately**; status **Deleted**; clear armed state. No “tap Delete twice”. |
| Edit | Keep arm → change → tap **Edit** again to finish (or add short status: `Editing`). Optional polish only if cheap in same MOB. |
| Status | Add `tactical.statusDeleted` = **Deleted**. Never leave **Deleting** after commit. |
| Zone row | Clearer row: **Incident** bold + **type badge** (Polygon / Circle), slightly larger type; still one line, no essay. |

### Wireframe (after APPLY)

```
ZONES
┌────────────────────────────────┐
│ 123              [Polygon]     │  ← ID strong · type as badge
└────────────────────────────────┘

DRAW
[Polygon] [Circle] [Edit] [Delete]

status: Deleted   (after remove)
```

### Out of this APPLY

- Turf / GPS / auto live / PTT  
- Server vault / `create-tactical-zone`  
- Ops map draw  
- APK / VC mobile  

---

## Risk

| Risk | Mitigation |
|------|------------|
| Accidental map click deletes | Only while Delete is armed; disarm after one delete; Esc / other tool cancels |
| Leaflet.draw Delete handler needs double finish | Prefer remove-on-click via our own click handler on FeatureGroup, or auto-`save()` on layer remove event |

---

## Operator gate

1. Read this disc.  
2. Say **`MOB-APPLY TACTICAL-DRAW-DELETE-LIST-UX-V1`** (or FAIL + what to change).  

Until named APPLY → **zero code**.

---

## One line

**Delete is stuck because finish needs a second Delete tap and never says Deleted; zone rows are too faint — next MOB = one-shot delete + Deleted status + clearer ID/type row.**
