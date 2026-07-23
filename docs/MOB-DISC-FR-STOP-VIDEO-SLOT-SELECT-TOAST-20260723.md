# MOB DISC — Select FR tile for Stop video · no toast on click

**Date:** 2026-07-23  
**Status:** APPLIED — `MOB-APPLIED-FR-STOP-VIDEO-SLOT-SELECT-TOAST-V1-20260723.md`  
**Operator:** Select a slot for **Stop video** → click tile → **no toast** on the slot.  
**Surface:** Analytics → Face (6 live tiles) — not Ops wall (unless you say otherwise).  
**Related:** `MOB-DISC-FR-STOP-VIDEO-SELECTED.md` (`mob-fr-stop-video-selected` APPLIED)

---

## Short verdict

| Claim | Truth |
|-------|--------|
| Click tile should mark it for **Stop video** | **Yes** — sets `focusedSlot` + cyan **focus ring** (`.is-focused`) |
| Click tile shows a **toast** today | **No** — never coded. Only the ring. Hint toast exists only when you press **Stop video** with **nothing** focused |
| Ring hard to see? | **Likely** — FLV fill, FR hit red border, or HQ bar can make focus easy to miss → feels like “click did nothing” |

So: selection **may** work silently; feedback is **too weak**, not “Stop video logic deleted.”

---

## What code does today

```
Click live tile  →  setFocusedSlot(n)  →  cyan inset ring
Click empty tile →  clear focus
Stop video       →  if no focus: hint “Click a live tile first…”
                 →  if focused: stop that cam only + remove from watch set
Tile ×           →  stop that slot (no need to focus first)
```

Hint helper: `showWatchHint` → `#ax-fr-watch-hint` (toolbar area).  
**Not** a per-slot toast overlay.

---

## Locked operator expectation (your logic)

1. Click live tile → **clear feedback** that this slot is the Stop video target.  
2. Then **Stop video** → only that stream dies.  
3. If no tile selected → toast: select a tile first (already exists; must be **visible**).

---

## Recommended single APPLY

**`MOB-APPLY FR-STOP-VIDEO-SLOT-SELECT-TOAST-V1`**

| Change | Why |
|--------|-----|
| On tile select: short **watch hint** toast e.g. “Selected slot {n} — {name}. Press Stop video.” | Confirms click worked |
| Stronger focus chrome (thicker ring / label “Stop target”) | Visible over FLV / red FR hit |
| Ensure `#ax-fr-watch-hint` sits **below HQ FR bar** (z-index / top offset when `fr-hq-alert-active`) | Hint not hidden under red/violet bar |

**Risk:** Low (FR UI only).  
**Not this MOB:** Ops wall panel Stop ■ toast; change Stop video → stop-all behaviour.

---

## Operator check now (no APPLY)

1. Click a **live** Face tile — look for **cyan** inset border.  
2. Click **Stop video** — that tile only should die.  
3. With **no** tile focused, click **Stop video** — do you see “Click a live tile first…” anywhere?

If (2) works but (1) has no toast → this MOB.  
If (2) kills **all** tiles → different bug (regress stop-selected); say so.

---

**Phrase when ready:** `MOB-APPLY FR-STOP-VIDEO-SLOT-SELECT-TOAST-V1`
