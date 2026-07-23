# MOB DISC — Case Files field report: align the left side (jagged inputs)

**Status:** APPLIED — `CASE-FILES-FORM-ALIGN-V1` (2026-07-22)  
**Date:** 2026-07-22  
**Trigger:** Operator screenshot — Field report form: **Title**, **Officer**, **SOS**, **Narrative** — left edges **don’t line up**; uneven gaps row 2→3; Narrative label looks wrong. “Can we align the left side? Do you even understand?”  
**Search:** `cf-meta-grid`, `cf-narrative-wrap`, `max-width 520px`, `field report align`  
**Related:** `MOB-DISC-CASE-FILES-FOUR-GAPS-20260722.md` item 3 · `CASE-FILES-DETAIL-FILL-SPLIT-V1` (wider pane makes mismatch worse)

---

## Yes — we understand. This is real.

You want **one clean left edge** — every label above its field, every input **same width**, **same vertical rhythm**:

```
Title      [________________________]
Officer    [________] Device [____] Status [___]   ← one row, aligned
SOS        [________________________]
Narrative  [________________________]
           [________________________]
```

What you have today is **jagged** — different grids, different width caps, narrative outside the grid.

---

## What you’re looking at

**Case Files → open case → Field report** (left pane).

| Symptom | Cause in code |
|---------|----------------|
| **Left edges don’t line up** | Title + Officer row inside `.cf-meta-grid`; **Narrative outside** the grid |
| **Narrative box narrower / shifted** | Global `#evidence-panel label.full … { max-width: 520px }` applies to narrative textarea; **meta-grid fields override to `max-width: none`** — only narrative is capped |
| **Row 2 → 3 gap feels wrong** | Detail mode uses **2-column** outer grid + nested **3-column** `cf-meta-row-3` + SOS full-width row — mixed gaps (`margin-bottom: 8px` on grid vs `label.full { margin-bottom: 8px }` on narrative) |
| **Narrative label looks at bottom** | After `FILL-SPLIT-V1`, flex/height on pane + `display: block` on narrative wrap can fight; label should always be **above** textarea |
| **Worse after equal-height panes** | Wider left box makes **520px cap** on narrative more obvious vs full-width Title |

**Not operator error. CSS structure bug.**

---

## Root cause (one diagram)

```
cf-field-report
  h4 Field report
  .cf-meta-grid          ← grid A (2-col in detail)
    Title (full)
    .cf-meta-row-3       ← grid B (3-col nested)
      Officer | Device | Status
    SOS (full)
  label.cf-narrative-wrap ← OUTSIDE grid C — different rules
    Narrative
    textarea (max 520px!)
```

Three layout systems → **no shared left rail**.

---

## What PASS looks like

| Rule | Detail |
|------|--------|
| **One left edge** | All inputs start at same x; all same width (100% of pane minus padding) |
| **Label always on top** | Title, Officer, SOS, Narrative — label above field, never beside or below |
| **Even spacing** | Same gap between every row (e.g. 10px) |
| **Officer / Device / Status** | One horizontal row, three equal columns, **aligned with Title above** |
| **Narrative** | Full width like Title; label on top; fixed rows (6), user resizes if needed |
| **No max-width 520px** in case file field report | Remove cap inside `#ev-panel-case-files.cf-detail-active` |

---

## Recommended MOB

**Name:** `CASE-FILES-FORM-ALIGN-V1`

### In scope

1. Replace mixed grids with **`.cf-form-stack`** — single column, uniform `gap`.
2. **Officer / Device / Status** — one `.cf-form-row-3` grid (3 equal cols), not nested inside 2-col meta-grid.
3. Move **Narrative inside** the same stack (after SOS).
4. CSS override: `#ev-panel-case-files.cf-detail-active .cf-field-report label.full input/select/textarea { max-width: none; width: 100%; }`
5. Label pattern: `display: flex; flex-direction: column; gap: 4px` — label top, control below.
6. Remove detail-active **2-column** `.cf-meta-grid` (use 1-col stack only in detail).
7. Cache bust `case-files-ui.js`.

### Out of scope

- Linked evidence picker
- Changing save/API fields
- Read-only view polish (can mirror stack in same MOB if small)

### Risk

**Low** — HTML template + scoped CSS in one pane.

### Verify

| # | Test | Pass |
|---|------|------|
| 1 | Title, SOS, Narrative inputs **same left edge** | ☐ |
| 2 | Officer row aligns with Title width | ☐ |
| 3 | Even gap Title → Officer row → SOS → Narrative | ☐ |
| 4 | Narrative label **on top** of textarea | ☐ |
| 5 | Equal-height panes still OK (`FILL-SPLIT-V1`) | ☐ |

---

## Agent pick

**`CASE-FILES-FORM-ALIGN-V1`** — this screenshot is exactly what item 3 in the four-gaps DISC described; FILL-SPLIT made it more visible.

Apply **after** `CASE-FILES-LIST-DETAIL-COL-FIT-V2` (ghost column) if you want list + form in one session — or form first if detail hurts more.

---

## Ask

**`MOB-APPLY CASE-FILES-FORM-ALIGN-V1`**
