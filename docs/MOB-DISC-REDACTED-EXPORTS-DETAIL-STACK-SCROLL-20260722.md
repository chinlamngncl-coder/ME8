# MOB DISC — Redacted exports Detail: Download / Open source still stack + scroll when list grows

**Status:** APPLIED — `REDACTED-EXPORTS-DETAIL-ONE-LINE-V3` (2026-07-22)  
**Date:** 2026-07-22  
**Trigger:** Operator screenshot — **Evidence → Redacted exports**, **Detail** column only. Every row shows **Download** on one line and **Open source** on the next. “When more cases are there, will it scroll?”  
**Correction:** Prior agent reply wrongly mapped this to **Case Files** list/back nav. **This screenshot is Redacted exports.** Case Files is a separate surface.

---

## Do we understand? Yes.

| What you’re looking at | What it is |
|------------------------|------------|
| Column header **Detail** | Redacted exports table — last column |
| **Download** | Finalized export file download |
| **Open source** | Opens original library evidence for that export |
| **Two lines per row** | Layout bug — V2 fixed ghost **boxes**, not **vertical stack** |

This is **not** a detail page with no back button. It is a **list table**. You go “back” by clicking another Evidence tab (Library, Case Files, etc.). There is no drill-in view here.

---

## Why Detail still looks wrong after V2

**V2 (`REDACTED-EXPORTS-DETAIL-ACTIONS-V2`)** removed full-width ghost buttons → links (good).

**Still FAIL:** each row’s actions sit on **two lines**:

```
Download
Open source
```

**Cause (code):**

1. Detail column fixed at **18%** (`table-layout: fixed`).
2. `.ev-rx-actions` uses `display: flex; flex-wrap: wrap` — when the cell is narrow, flex **wraps** the second link to the next line.
3. HTML renders `dl + open` with **no separator** — reads like a broken list, not one action group.
4. Row height grows with every wrapped link → table feels tall and repetitive (your screenshot: 8 identical two-line stacks).

**What PASS looks like:**

```
Download · Open source     ← one line per row
```

Or a single **Actions** label with both links inline, `flex-wrap: nowrap`, min-width on Detail column if needed.

---

## Scroll — when there are more exports

**Today’s behaviour (already in code):**

| Situation | What happens |
|-----------|----------------|
| **Few rows (≤12 on screen)** | Table is **compact** — no inner scroll void (`ev-rx-few-rows`). |
| **Many rows (>12, still one page)** | List box **grows to fill** the Evidence panel; **vertical scroll inside the table box** (`#ev-rx-table-wrap { overflow-y: auto }`). |
| **More than 50 exports total** | **Pagination** — toolbar shows **Previous / Next** (`RX_PAGE_SIZE = 50`). You page through; each page can scroll if rows exceed viewport height. |

So **yes** — when the list gets long enough, you **scroll down inside the redacted exports table**. You do **not** need a separate “scroll down option” control; the scrollbar appears on the list panel when content overflows.

**Not today:** infinite scroll / “load more” — it is **page + scroll**, same family as Evidence Library catalog.

---

## What this is NOT

| Misread | Truth |
|---------|--------|
| Case Files Open/Delete | Wrong tab — that’s Case Files **Detail/Manage** columns |
| Missing back button | Redacted exports has **no sub-page** — only tab nav |
| Data missing | Files are listed; layout only |

---

## Recommended MOB (one APPLY)

**Name:** `REDACTED-EXPORTS-DETAIL-ONE-LINE-V3`

### In scope

1. Detail cell: **`flex-wrap: nowrap`** (or single inline row).
2. Render **`Download · Open source`** with visible separator (match Investigation holds / Case Files link pattern).
3. Slightly widen Detail column or shrink Source column if nowrap clips on small screens — test at 1280px.
4. Row height: one line for actions; keep V2 link styling.
5. Cache bust `evidence-hub.js` if HTML template changes.

### Out of scope

- Pagination size change (50 is OK unless operator asks)
- Blur / finalize workflow
- Case Files (separate MOBs)

### Verify

| # | Test | Pass |
|---|------|------|
| 1 | 8 rows: Detail = **one line** per row (Download · Open source) | ☐ |
| 2 | 20+ rows on one page: **vertical scroll** inside table box | ☐ |
| 3 | 50+ total: **Previous/Next** pager visible | ☐ |
| 4 | No return of full-width ghost boxes | ☐ |

---

## Agent pick

Apply **`REDACTED-EXPORTS-DETAIL-ONE-LINE-V3`** — your screenshot is the remaining FAIL after V2; scroll behaviour for long lists is already there but worth re-check on PASS with 15+ rows.

---

## Related

- V2 applied: `MOB-APPLIED-REDACTED-EXPORTS-DETAIL-ACTIONS-V2-20260722.md`
- Fill layout: `MOB-APPLIED-REDACTED-EXPORTS-FILL-LAYOUT-V1-20260722.md`
- Render: `loadRedactedExports()` · `RX_PAGE_SIZE = 50` · `setRedactedExportsLayout()` in `evidence-hub.js`
