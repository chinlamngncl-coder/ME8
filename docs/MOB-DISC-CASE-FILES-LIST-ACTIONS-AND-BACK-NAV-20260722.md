# MOB DISC — Case Files list Detail column ugly + “how do I go back?”

**Status:** APPLIED — `CASE-FILES-LIST-ACTIONS-V2` + `CASE-FILES-BACK-NAV-V1` (2026-07-22).  
**Date:** 2026-07-22  
**Trigger:** Operator screenshots — Detail column shows stacked Open/Delete ghost boxes; detail view feels like a trap with no obvious exit.  
**Search:** `case files back`, `cf-back`, `cf-list-actions`, `colDetail`, `.btn width 100%`  
**Related:** `MOB-DISC-CASE-FILES-DETAIL-UGLY-SCROLL-20260722.md` · `MOB-APPLIED-REDACTED-EXPORTS-DETAIL-ACTIONS-V2` · `MOB-APPLIED-FR-HOLDS-CARD-ACTIONS-V1`

---

## What you’re looking at (plain English)

### Screenshot 1 — **Case Files list**, zoomed on **Detail**

That is **not** a separate page. It is the **table list** on Evidence → **Case Files**:

| Column | What it is |
|--------|------------|
| **Detail** | **Open** — opens the field-report editor for that row |
| **Manage** (super-admin only) | **Delete** — removes the case file |

The ugly stacked rectangles are **the same global CSS bug** we already hit on Redacted exports and Investigation holds:

```css
.btn { width: 100%; }   /* public/index.html ~3887 */
```

Inside a narrow table cell, every **Open** / **Delete** becomes a **full-width ghost button** — nested borders, vertical staircase, non-enterprise.

**Prior partial fix:** `CASE-FILES-DETAIL-COMPACT-V1` added `width: auto` on `#cf-list-wrap .cf-list-actions .btn` — but buttons are still **ghost `.btn` boxes**, not **inline link actions**. Operator still sees tall wireframe stacks (FAIL).

If cache is stale (no Ctrl+F5 after last MOB), symptoms are worse — but even with current CSS this surface is **not** at Redacted-exports V2 / Holds V1 parity.

---

### Screenshot 2 — **Case Files detail** (field report editor)

That **is** the case editor — title, officer, narrative, linked evidence.

**Back exists today** — it is just easy to miss:

- Top-left of the detail header: **`← Back to case files`** (`#cf-back` in `case-files-ui.js`)
- Clicking it calls `showList()` and returns to the table.

**Why it feels like “no go back”:**

| Problem | Effect |
|---------|--------|
| Back is a **small ghost button** in a crowded header row | Looks like secondary chrome, not primary navigation |
| **List toolbar hidden** in detail (New / SOS / Refresh gone) | Page feels like a different app with no way out |
| **No breadcrumb** | Evidence & Docking → Case Files → *this case* — trail not shown |
| **Case Files tab** still visible but not labeled “you are here” | Operators don’t know tab click resets view |
| Same `.btn` styling | Back competes visually with Save / Delete |

So: **not missing function — missing obvious navigation.**

---

## How to go back **right now** (operator)

1. Click **`← Back to case files`** — top-left of the detail header (above/near the case title).
2. Or click **Case Files** in the Evidence hub nav again — should return to list (if not, that’s a separate bug to log on PASS/FAIL).

---

## Root cause (one line)

**Global full-width buttons inside table cells + weak detail header chrome.**

Same family as Redacted exports Detail column and Investigation holds card actions — fix pattern is **scoped inline link actions**, not another `width: auto` on ghost `.btn`.

---

## Recommended MOBs (one at a time)

| Order | MOB name | Scope |
|-------|----------|--------|
| 1 | **`CASE-FILES-LIST-ACTIONS-V2`** | Detail **Open** + Manage **Delete** → inline links (`ev-rx-action-link` pattern); single **Actions** column optional merge |
| 2 | **`CASE-FILES-BACK-NAV-V1`** | Prominent back bar: full-width subtle strip **above** detail, left arrow + “Back to case files”; keep list toolbar visible as disabled or show breadcrumb |

**Out of scope for these two:** case workflow, SOS link logic, delete password gate (already OK).

---

## Verify after APPLY

1. Ctrl+F5 only (CSS/JS).
2. Case Files list → Detail column = **one line of links**, not stacked boxes.
3. Open a case → **obvious back control** visible without hunting.
4. Back → list returns with filters intact.

---

## Agent pick (if user says go ahead)

Apply **`CASE-FILES-LIST-ACTIONS-V2` first** — screenshot 1 is the louder FAIL; back nav is UX polish second.
