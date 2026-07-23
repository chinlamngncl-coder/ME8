# MOB DISC — Case Files list Detail column: V3 FAIL — inner void (listen to screenshot)

**Status:** FAIL — horizontal scroll + Detail off-screen (2026-07-22). See `MOB-DISC-CASE-FILES-LIST-TABLE-ONE-VIEW-V5-20260722.md`  
**Date:** 2026-07-22  
**Trigger:** Operator screenshot after `CASE-FILES-LIST-DETAIL-COL-FIT-V3` — **Open · Delete** readable but **large empty box inside Detail column**; vertical line between links and void; “failed… fix it once?”  
**Search:** `width 10%`, `COL-FIT-V3`, `cf-list-actions`, `table-layout fixed`, `inner void`  
**Related:** `MOB-APPLIED-CASE-FILES-LIST-DETAIL-COL-FIT-V3` (FAIL) · Redacted exports COL-FIT-V1 (works)

---

## We hear you. V3 fixed the wrong thing.

| MOB | Symptom | What we did | Result |
|-----|---------|-------------|--------|
| **V2** | **“Op” / “De”** — text crushed | `width: 1%` only | FAIL — clip |
| **V3** | Crush gone | **`width: 10%`** + min-width | FAIL — **void inside column** |

V3 traded **clip** for **gutter**. Your screenshot is the gutter failure — not the same bug as V2.

**One column. One fix. Not 100 MOBs.**

---

## What your screenshot shows (read it correctly)

```
Detail
┌─────────────────────────────┐
│ Open · Delete │   (void)   │  ← links left; empty same-colour box right
└─────────────────────────────┘
         ↑ vertical line = cell/column edge, not a ghost col 8
```

| You see | Meaning |
|---------|---------|
| **Open · Delete** full text | V3 min-width worked for **text** |
| Wide dark area **inside** Detail | Column allocated **~10% of table** (~120–180px) |
| Links hug **left** | `display:flex` on `<td>` wraps content; does not fill cell |
| Vertical line before void | **Right side of link cluster** vs empty cell interior — or column border |
| No separate ghost column | HTML is **7 columns** — void is **inside col 7**, not col 8 |

**Root cause:** V3 set **`width: 10%`** on col 7. Under `table-layout: fixed`, that **reserves a wide column**. Links only need **~11em**. The rest is **phantom void in the same cell**.

We did **not** listen: the DISC said **`width: auto` / shrink-to-fit**; we shipped **`width: 10%`**.

---

## What PASS looks like (once)

| Rule | Detail |
|------|--------|
| **Open · Delete** full text | One line |
| **Detail** header fits | No clip |
| **Column width ≈ links** | No empty box inside the cell |
| **No ghost col 8** | Keep 7 `<th>` |
| **Slack goes to Title / Case ID** | Ellipsis on long text — not Detail |

Match **Redacted exports** list: col 7 shrinks; other cols absorb width.

---

## One-shot MOB (agent pick)

**Name:** `CASE-FILES-LIST-DETAIL-COL-FIT-V4`

### In scope (CSS only — `public/index.html`)

1. **Remove** V3 mistake on col 7:
   - ❌ `width: 10%`
   - ❌ `max-width: 11em`
2. **Set** shrink-to-fit + floor (same family as Redacted exports, longer label):
   ```css
   #ev-panel-case-files .evidence-table th:nth-child(7),
   #ev-panel-case-files .evidence-table td:nth-child(7) {
       width: 1%;
       min-width: 11em;   /* fits Open · Delete */
       white-space: nowrap;
   }
   ```
3. **Rebalance** cols 1–6 so they take **remaining** width (e.g. 16 / 28 / 12 / 8 / 7 / 15 — total 86%; col 7 takes ~1% + min-width em).
4. **Keep** `td.cf-list-actions` overflow visible; list link styles unchanged.
5. **Optional harden:** `display: table-cell` on list `td.cf-list-actions` only (stop flex on the cell); flex stays on detail-pane `.cf-ev-actions` — only if V4 CSS alone still shows void.

### Out of scope

- Detail pane box (BOX-CLOSE-V2)
- Renaming column to “Actions”

### Risk

**Very low** — one CSS block revert + correct shrink rule.

### Why this is once

| V2 bug | `1%` without `min-width` → clip |
| V3 bug | `10%` → wide column → inner void |
| **V4** | `1%` **+** `min-width: 11em` → column = link width, slack to Title |

That is the **only** combination we have not shipped correctly yet.

### Verify

| # | Test | Pass |
|---|------|------|
| 1 | **Detail** header — full word | ☐ |
| 2 | **Open · Delete** — full, one line | ☐ |
| 3 | **No** empty box inside Detail cell (links to column edge) | ☐ |
| 4 | No 8th column / no wide gutter **after** Detail column | ☐ |
| 5 | Long titles still ellipsis — table fills width | ☐ |

---

## Ask

**`MOB-APPLY CASE-FILES-LIST-DETAIL-COL-FIT-V4`**

One APPLY. No bundle.
