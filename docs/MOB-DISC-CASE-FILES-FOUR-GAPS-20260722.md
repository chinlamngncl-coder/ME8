# MOB DISC — Case Files: four open failures (equal height, linked evidence, form mess, Detail blank)

**Status:** DISC only — **no APPLY**  
**Date:** 2026-07-22  
**Trigger:** Operator screenshots + questions — (1) unequal pane heights, (2) what is Linked evidence for?, (3) untidy Title/Narrative spacing rows 2–3, (4) Detail column blank right of Open·Delete. “How long must we discuss?”  
**Search:** `case files equal height`, `linked evidence`, `form align`, `detail column blank`, `cf-meta-grid`  
**Bundles:** Four separate MOBs — **one APPLY each**, fixed order below.

---

## We understand — four different problems

| # | Your question | Surface | Verdict |
|---|---------------|---------|---------|
| **1** | Equal height first | **Detail** — Field report \| Linked evidence | Left tall, right short + page void — **layout bug** (`MOB-DISC-CASE-FILES-DETAIL-RIGHT-BLANK-20260722.md`) |
| **2** | Linked evidence for what? | **Detail** — right pane | **Product gap** — no clear hint; wrong ID type easy to type |
| **3** | Input tabs untidy, row 2–3 spacing | **Detail** — left form | **CSS structure bug** — mixed grids + `label.full` margins |
| **4** | Detail column blank after Delete | **List** table last column | **Column too wide** — same as Redacted exports (`MOB-DISC-REDACTED-EXPORTS-DETAIL-COL-RIGHT-BLANK`) |

Plus (from prior message, same session): **list scroll with 2–4 rows** → `CASE-FILES-LIST-SCROLL-WHEN-FULL-V1` (not repeated here in depth).

**The blank is never intentional.** Not reserved space. Not “for later.”

---

## 1) Equal height — two full boxes

### What you see

```
┌─ Field report (tall) ──────┬─ Linked evidence (short) ─┐
│ Title, Officer, Narrative… │ Link bar + “No evidence…”  │
│                            │                            │
└────────────────────────────┘                             │
                             └── blank under right pane ──┘
```

### Cause

`CASE-FILES-DETAIL-COMPACT-V1` set `align-items: start` and `height: auto` — killed scroll void **inside** narrative but **broke equal panes**.

### MOB

**`CASE-FILES-DETAIL-FILL-SPLIT-V1`**

- Grid `align-items: stretch`; both panes fill row height to viewport below back bar.
- Narrative stays fixed rows (no flex-grow void).
- Linked evidence pane matches left height; internal scroll only when many clips.

---

## 2) Linked evidence — what is it for?

### Plain answer (today’s product)

**Not a case number.** Not SOS ID. Not BWC name.

| You link | ID from where | Example |
|----------|---------------|---------|
| **Evidence library clip** | Evidence → **Evidence Library** row → **Evidence ID** | Catalog file id (e.g. hash/uuid shown in library) |

**Workflow:**

1. BWC uploads / docks → clip appears in **Evidence Library**.
2. Open **Case file** → **Linked evidence** → paste that **Evidence ID** → **Link evidence**.
3. Clip shows in the table; **Open** jumps to library detail; **Unlink** removes link (file stays in library).

**Case ID** (`CF-…`) identifies the **folder/report**. **Evidence ID** identifies the **video/file**. Different objects.

Typing random text (e.g. `sss`) → API reject or not found — field gives almost no guidance today.

### Gap

- Placeholder: “Evidence ID from library” — too thin.
- No one-line hint under heading (like Case Files purpose hints at list top).
- No “pick from library” browse (future; out of scope v1).

### MOB

**`CASE-FILES-LINKED-EVIDENCE-HINT-V1`**

- Hint under **Linked evidence** heading: *Paste the Evidence ID from Evidence Library — not the case ID.*
- Stronger placeholder + optional link-styled **Open Evidence Library** (switches hub tab).
- i18n only + small HTML — no API change.

---

## 3) Form alignment — Title, rows 2–3, Narrative untidy

### What you see

- Title row vs Officer/Device/Status vs SOS vs Narrative — **uneven vertical gaps** (row 2 → 3 especially).
- Labels/inputs feel like different “tabs” with no shared rhythm.
- Narrative label sits awkwardly relative to SOS block.

### Cause (code)

Form is **split structures**:

```
cf-meta-grid
  ├─ Title (span-full)
  ├─ cf-meta-row-3 (Officer | Device | Status)
  └─ SOS (span-full)          ← still inside grid
label.full cf-narrative-wrap    ← OUTSIDE grid — different margin rules
```

- `#evidence-panel label.full { margin-bottom: 8px }` on narrative.
- `.cf-meta-grid label.full { margin-bottom: 0 }` inside grid.
- Detail-active grid is **2 columns** but row-3 is **3 columns** nested — visual jump before SOS full-width row.

### MOB

**`CASE-FILES-FORM-ALIGN-V1`**

- Single vertical stack: `.cf-form-stack` with uniform `gap: 10px` (or 8px).
- Rows: Title full width → Officer/Device/Status one grid row → SOS full width → Narrative full width.
- All labels same typography; inputs `width: 100%` within pane.
- Remove double margins between meta-grid and narrative.

---

## 4) List Detail column — blank right of Open·Delete

### What you see

Zoomed **Detail** column: links on the **left**, ~60% of cell **empty** on the right. Third screenshot shows same for Delete-only zoom — column wider than content.

### Cause

```css
#ev-panel-case-files .evidence-table td:nth-child(7) { width: 14%; min-width: 108px; }
table-layout: fixed; width: 100%;
```

`Open · Delete` needs ~120px; column gets 14% of wide table → dead gutter. **Same bug family as Redacted exports Detail** before `DETAIL-COL-FIT`.

### MOB

**`CASE-FILES-LIST-DETAIL-COL-FIT-V1`**

- Last column `width: 1%` + `white-space: nowrap` (shrink-to-fit).
- Drop or reduce `min-width: 108px`.
- Give freed % to **Title** and **Case ID** columns.
- Optional: rename header **Detail** → **Actions**.

---

## Apply order (locked — agent pick)

| Phase | MOB | Why |
|-------|-----|-----|
| 1 | `CASE-FILES-DETAIL-FILL-SPLIT-V1` | Equal height — your #1 |
| 2 | `CASE-FILES-LINKED-EVIDENCE-HINT-V1` | Explain product before more layout |
| 3 | `CASE-FILES-FORM-ALIGN-V1` | Tidy left pane spacing |
| 4 | `CASE-FILES-LIST-DETAIL-COL-FIT-V1` | List Detail blank |
| 5 | `CASE-FILES-LIST-SCROLL-WHEN-FULL-V1` | Few-row scroll void (prior DISC) |

**One MOB-APPLY at a time** → operator PASS → next.

---

## Verify summary (after all five)

| # | Pass |
|---|------|
| 1 | Two panes **same height**, edge to edge |
| 2 | Linked evidence hint clear; operator knows **library Evidence ID** |
| 3 | Title → row2 → SOS → Narrative **even spacing** |
| 4 | List Detail column **no wide blank** |
| 5 | 2–4 cases in list — **no scroll into void** |

---

## Ask

Start with:

**`MOB-APPLY CASE-FILES-DETAIL-FILL-SPLIT-V1`**
