# MOB DISC — Case Files detail: ugly alignment + pointless scroll (open case)

**Status:** APPLIED 2026-07-22 — `MOB-APPLIED-CASE-FILES-DETAIL-COMPACT-V1-20260722.md`  
**Mode:** Shipped  
**Search:** `case file detail`, `field report ugly`, `linked evidence scroll`, `not aligned`, `open case`  
**Trigger:** Operator screenshot — new/open case detail: two tall boxes, misaligned columns, scroll into empty  
**Genre:** Evidence Hub · Case Files detail (not list empty — that was V2)

---

## Straight answer

**The case exists and opened correctly.** The **layout** is wrong: detail view copies the “fill the viewport” pattern from the list/table, so a **short form** is stretched into two **skyscraper panels** with scroll into blank.

| What you see | Meaning |
|--------------|---------|
| Left box huge below Narrative | **CSS** — narrative + column set to `flex: 1` grow |
| Right box mostly empty | **CSS** — linked-evidence scroll shell grows with no rows |
| Columns feel misaligned | **CSS** — `align-items: stretch` + unequal content |
| Scroll down → nothing useful | **CSS** — panel `min-height: calc(100vh - …)` + inner `overflow: auto` |

Not missing data. Not a save bug.

---

## Root cause (code)

When you open a case (especially after **New case file**), list is non-empty → panel loses `cf-list-empty`:

```css
#ev-panel-case-files:not(.cf-list-empty) {
    min-height: calc(100vh - 168px);  /* forces full screen */
}
.cf-detail-grid { flex: 1; align-items: stretch; }
.cf-narrative-wrap textarea { flex: 1; min-height: 120px; }  /* eats left column */
.cf-ev-scroll { flex: 1; overflow: auto; }                 /* empty scroll right */
```

```
┌─ Field report ─────────────┐ ┌─ Linked evidence ──────────┐
│ Title, Officer, Status…   │ │ [Evidence ID] [Link]       │
│ Narrative (short text)    │ │ No evidence linked yet     │
│                           │ │                            │
│     (flex grow void)      │ │     (flex grow void)       │
│         ↓ scroll          │ │         ↓ scroll           │
└───────────────────────────┘ └────────────────────────────┘
```

List-empty V2 fixed the **empty table** graveyard. **Detail view** still uses fill/stretch — same family of bug.

---

## Alignment issues (why it looks ugly)

| Issue | Cause |
|-------|--------|
| Left/right columns same forced height | Grid `align-items: stretch` + both sections `flex` column fill |
| Officer / Device / Status row vs right link bar | Different grid systems; no shared baseline |
| Narrative tiny but box tall | Textarea `flex: 1` on parent flex column |
| “Updated” line floating in void | Footer not pinned; column stretched above it |
| Header row (Back / title / Save) | `cf-detail-head` wrap OK but sits above stretched grid |

---

## What operator wants (product bar)

| Rule | Detail |
|------|--------|
| **Compact when content is short** | Form height ≈ fields + narrative — no viewport stretch |
| **No scroll into blank** | Scroll only inside linked-evidence **when many clips** |
| **Aligned columns** | Top-aligned; equal visual weight; no 80% empty right box |
| **Narrative** | Fixed sensible height (e.g. 5–8 rows), user resizes if needed — not auto-fill column |
| **Empty linked evidence** | One line hint — no scroll shell |

---

## Recommended MOB

**Name:** `CASE-FILES-DETAIL-COMPACT-V1`

### In scope
1. **`cf-detail-active` on panel** when `#cf-detail-wrap` visible — **no** `min-height: calc(100vh - …)` on detail.  
2. **`.cf-detail-grid`**: `align-items: start`; `flex: 0 1 auto` — height from content.  
3. **Narrative**: remove `flex: 1` grow; `rows="6"`, `min-height` ~100px, `resize: vertical` only.  
4. **Linked evidence empty**: `.cf-ev-scroll` compact — no `flex: 1` until ≥1 row (class toggle from JS).  
5. **Sections** (`.cf-field-report`, `.cf-linked-evidence`): `height: auto`; min-height unset.  
6. **`#evidence-panel`**: `overflow: hidden` or no outer scroll on case detail (like list empty).  
7. Optional polish: link bar — input + button one row, aligned with meta grid gap.

### Out of scope
- Case list empty (done V2)  
- Redacted exports row compact (done)  
- Field validation / auto-save  
- Changing 2-column vs 1-column product layout (keep 2-col; fix stretch only)

### Risk
**Low** — CSS + small JS class on evidence table empty/non-empty.

### Verify

| # | Test | Pass |
|---|------|------|
| 1 | Open new case — **no** scroll into blank below narrative | ☐ |
| 2 | Right panel short when “No evidence linked yet” | ☐ |
| 3 | Link 5+ clips — evidence area scrolls **inside** right box only | ☐ |
| 4 | Columns top-aligned; no 80% empty right tower | ☐ |
| 5 | Back to list — list fill behaviour unchanged | ☐ |

---

## Order vs other open items

| Priority | MOB | Why |
|----------|-----|-----|
| **Now** | **`CASE-FILES-DETAIL-COMPACT-V1`** | Your screenshot — detail is the daily path after create/open |
| Done | `CASE-FILES-EMPTY-COMPACT-V2` | List empty |
| Done | `REDACTED-EXPORTS-ROW-COMPACT-V1` | Redacted list rows |

---

## Ask

**`MOB-APPLY CASE-FILES-DETAIL-COMPACT-V1`**

One APPLY — detail compact only. Do not bundle with list or redact MOBs.

---

## Related

- List empty: `MOB-APPLIED-CASE-FILES-EMPTY-COMPACT-V2-20260722.md`  
- Code: `loadDetail()` in `public/js/case-files-ui.js`; `.cf-detail-grid` in `public/index.html`  
- `showDetail()` / `#cf-detail-wrap` visibility
