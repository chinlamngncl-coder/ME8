# MOB DISC — Case Files Detail column: blank box after Delete (ghost 8th column)

**Status:** APPLIED — `CASE-FILES-LIST-DETAIL-COL-FIT-V2` (2026-07-22)  
**Date:** 2026-07-22  
**Trigger:** Operator screenshot — Detail column zoomed. `Open · Delete` on the left, **vertical line**, then **empty boxed area** to the right. “Can’t you not put the vertical line after Delete? Then it will naturally be in the box.”  
**Search:** `cf-col-delete`, `Detail blank`, `Manage column hidden`, `CASE-FILES-LIST-ACTIONS-V2`  
**Related:** `MOB-APPLIED-CASE-FILES-LIST-ACTIONS-V2` · `MOB-APPLIED-REDACTED-EXPORTS-DETAIL-COL-FIT-V1`

---

## Yes — we see it. Here is exactly what it is.

You are **not** imagining it. That blank area is a **real second table column** — not padding, not “reserved space.”

```
┌─ Detail header ─────────────────────────────────────┐
│ Open · Delete │ │ ← BLANK (ghost col 8)          │
└───────────────┴─┴──────────────────────────────────┘
                 ↑
          vertical line you see = border between
          col 7 (actions) and col 8 (empty Manage)
```

### Root cause (code — confirmed)

`CASE-FILES-LIST-ACTIONS-V2` merged **Open** and **Delete** into **one** Detail cell (7 `<td>` per row).

But the **table header still has 8 columns**:

```html
<th>Detail</th>
<th id="cf-col-delete" hidden>Manage</th>   ← STILL IN THE TABLE
```

`hidden` hides the **Manage** label — it does **not** remove the column from the table grid. Browser still allocates **column 8** with borders → **empty boxed cells** on every row. That is the blank after Delete.

Also: column 7 is still **14% + min-width 108px** — wider than `Open · Delete` needs (same waste as Redacted exports before COL-FIT).

**Two bugs, one screenshot:**
1. **Ghost 8th column** (main — the vertical line + blank box)
2. **Detail column too wide** (secondary gutter inside col 7)

---

## What you asked for (plain English)

| Your words | Fix |
|------------|-----|
| “Blank box after Delete” | **Delete the Manage column** from the table — not `hidden`, **gone** |
| “Don’t put vertical line after Delete” | No col 8 → no border → no empty box |
| “Naturally in the box” | Shrink Detail col to fit links (`width: 1%` trick, like Redacted exports COL-FIT) |

---

## Recommended MOB

**Name:** `CASE-FILES-LIST-DETAIL-COL-FIT-V2`

(V2 because LIST-ACTIONS-V2 merged actions but left ghost column.)

### In scope

1. **Remove** `<th id="cf-col-delete">` from `index.html` entirely.
2. **Remove** JS that toggles `cf-col-delete` hidden.
3. Fix placeholder row `colspan="8"` → **`colspan="7"`**.
4. Detail column CSS: **`width: 1%`**, **`white-space: nowrap`**, drop **`min-width: 108px`**.
5. Give freed % to **Title** / **Case ID** columns.
6. Optional: rename header **Detail** → **Actions** (i18n).

### Out of scope

- Detail view two-pane layout (already `FILL-SPLIT-V1`)
- Link evidence picker

### Risk

**Very low** — HTML + CSS; no API.

### Verify

| # | Test | Pass |
|---|------|------|
| 1 | Detail column: **no blank box** right of Open·Delete | ☐ |
| 2 | **No extra vertical line** after actions | ☐ |
| 3 | 7 columns only in table (inspect header) | ☐ |
| 4 | List scroll / few-rows still OK | ☐ |

---

## Why this wasn’t caught on LIST-ACTIONS-V2

V2 fixed **button style** and merged actions into one `<td>` but **forgot to remove the Manage `<th>`**. Half fix → ghost column stayed.

Redacted exports COL-FIT was applied; **Case Files list never got the matching COL-FIT + column removal.**

---

## Ask

**`MOB-APPLY CASE-FILES-LIST-DETAIL-COL-FIT-V2`**

One APPLY. Should take minutes. Ctrl+F5 to verify.
