# MOB DISC — OPS-CASE NOTES: ADD vs EDIT (permission model)

**Date:** 2026-08-10  
**Code:** no change this turn (MOB DISC only).  
**Related UI copy:** `opsCases.gateOps` / `opsCases.gateAdmin` in Cases desk.

---

## Plain English

Case notes are a **list of separate entries**, not one shared text box that everyone rewrites.

### Add note (any operator who can open the case)

1. Type in the box → **Save note** → creates **one new note card** (e.g. “abcd”).  
2. Type again → **Save note** → creates **another** card (e.g. “efgh”).  
3. Old cards stay. You are **not** changing the first Save — you are **appending**.

So “keep typing and Save again” ≠ edit. It means **stack more notes**.

### Edit / Delete (Super admin only — locked in store)

- **Edit** = change text **inside** an already-saved card.  
- **Delete** = remove a card that was already saved.  

Server (`opsCaseStore` `editNote` / `deleteNote`) returns **403** unless actor is Super admin. UI shows Edit/Delete buttons only when `isSuperAdmin()`.

---

## Your example

| Step | Who | Result |
|------|-----|--------|
| Type `abcd` → Save | Operator | Card 1: `abcd` |
| Later type `abcd ded` → Save | Operator | Card 2: `abcd ded` (Card 1 still `abcd`) |
| Change Card 1 text or Delete Card 1 | **Super admin** | Allowed |
| Operator tries Edit/Delete on Card 1 | Blocked | No buttons / 403 |

Operator **cannot** “fix” a bad first Save by editing it — they **add a correcting note** instead (audit trail). That is why Super admin exists here: **integrity of past notes**, not blocking new notes.

---

## If you could Edit/Delete “just now”

Likely you are logged in as **Super admin** (or equivalent). Operators without that role should see **Save note** only, no Edit/Delete on past cards.

If product should allow “author may edit own note within N minutes” — that is a **new** named MOB (not current lock). Say so and we design before APPLY.

---

## Why Super admin at all?

Without it: anyone who can open the case can rewrite or erase history after the fact. For ops / evidence-adjacent Cases, past note text is treated as **touch-log grade** — append freely, rewrite only with elevated role.

---

## Next (only if you want product change)

- Keep current lock → no APPLY.  
- Or name e.g. `OPS-CASE-NOTE-AUTHOR-EDIT-OWN-V1` if operators may edit/delete **their own** notes only.
