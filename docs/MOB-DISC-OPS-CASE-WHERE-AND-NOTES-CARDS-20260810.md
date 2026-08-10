# MOB DISC — Where to find the Case + notes = save cards only (2026-08-10)

**Status:** LOCKED (paper). Scroll fix after note Save is separate code patch (same day).  
**Also:** `.cursorrules` credit-lean block stands — no repo scan this turn.

---

## 1. Where do I find “the case”? Will Case Files show everything?

**No.** Cases and Case Files are **two different lanes** (locked earlier: `MOB-DISC-CASES-VS-CASE-FILES-VS-FTP-LOGIC-20260809.md`).

| What you want | Where to click | What you see |
|---------------|----------------|--------------|
| Alert ticket (SOS / Face / Plate / Weapon): status, notes cards, activity, linked media, map | **Evidence → Cases** → open the row | **Ops Case desk** — this is “see everything” for that alert |
| Written field report / narrative form | **Evidence → Case Files** | Report documents — **not** the auto alert ticket |
| Video / photo bytes | **Evidence → Library** (or your FTP/storage path) | Files on disk |

**Operator path:** Evidence → **Cases** → pick the case → desk (media + map + fields + **Notes** cards + **Activity**).

Case Files will **not** automatically mirror every Ops Case note. Linking Case File ↔ Case later is a different MOB if you want it.

---

## 2. Notes — final product rule (your call)

**Save + Save = new cards only.** Locked OK.

- Each **Save note** = one new card.  
- Operators keep adding cards.  
- Changing/removing an old card = Super admin only (audit).  
- No change requested to remove Super admin Edit/Delete — leave as elevated tools.

---

## 3. Scroll stuck after Save / Delete (cause)

After note Save/Delete, UI calls `loadList` → `renderList` → layout sync with **`inDetail: false`**, which drops `#evidence-panel.ev-ops-cases-detail` and can leave the Evidence panel on **`overflow: hidden`** → desk feels frozen.

**Fix name:** patch `syncOpsListLayout(..., !!state.current)` when refreshing list while a case is open. (Applied in code same day if this disc ships with the one-line fix.)

---

## Next queue (unchanged)

`OPS-CASE-BIND-LIBRARY-PICKER-V1` when you APPLY.
