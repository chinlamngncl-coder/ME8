# MOB DISC — Case Files detail: blank on the right — why not two full boxes?

**Status:** APPLIED — `CASE-FILES-DETAIL-FILL-SPLIT-V1` (2026-07-22). Link simplify: `MOB-DISC-CASE-FILES-LINK-EVIDENCE-SIMPLIFY-20260722.md`  
**Date:** 2026-07-22  
**Trigger:** Operator — open case detail: **blank space on the right**; “can’t you just make **2 full box all the way to right**? what is the blank space for?”  
**Search:** `case files detail blank`, `two pane fill`, `cf-detail-grid`, `right void`, `field report linked evidence`  
**Related:** `MOB-APPLIED-CASE-FILES-DETAIL-COMPACT-V1` · `MOB-APPLIED-CASE-FILES-BACK-NAV-V1`

---

## Straight answer

**The blank is not for anything.** It is leftover layout from **COMPACT-V1** swinging too far the other way.

You want:

```
┌─ Field report ─────────────┬─ Linked evidence ────────────┐
│  (full height)             │  (full height)               │
│                            │                              │
│                            │                              │
└────────────────────────────┴──────────────────────────────┘
         ↑ both boxes edge-to-edge across the panel ↑
```

What you get today:

```
┌─ Field report ─────────────┬─ Linked evidence ──┐
│  Title, fields, narrative  │  Link bar          │
│  (taller)                  │  No evidence yet   │
└────────────────────────────┘
                              │← blank: short box │
                              │   + dead viewport │
                              │   on the right    │
                              └───────────────────┘
```

---

## What you’re looking at

**Evidence → Case Files → Open a case**

| Box | Role |
|-----|------|
| **Left** | Field report (title, officer, narrative, …) |
| **Right** | Linked evidence |

Two bordered panels in a **50/50 grid**. The blank on the right is **not** a third column or reserved area — it is **unused space** because:

1. **Columns top-align, don’t stretch** — `align-items: start` (COMPACT-V1) so the shorter right box does not grow to match the left.
2. **Detail panel doesn’t fill the viewport** — `cf-detail-active` uses `display: block; flex: 0 0 auto` so the panel is only as tall as the form; the rest of the screen stays empty dark background (often most visible on the **right** under the shorter box).
3. **No “fill split” rule** — list view was taught to fill height; detail view was taught to shrink — inconsistent.

**The blank is not intentional.** Not for future widgets, not for IT, not “breathing room.”

---

## Root cause (code)

| Rule (today) | Effect |
|--------------|--------|
| `#ev-panel-case-files.cf-detail-active { flex: 0 0 auto; display: block }` | Panel height = content only → void below |
| `.cf-detail-grid { align-items: start }` when detail active | Right box stays short |
| `.cf-field-report` / `.cf-linked-evidence { height: auto }` | No equal-height panes |
| `#evidence-panel.ev-case-files-detail { overflow: hidden }` | Outer scroll off; inner void visible |

COMPACT-V1 correctly killed **scroll into blank inside** a stretched narrative — but it left **dead space outside** the boxes.

---

## What operator wants (product bar)

| Rule | Detail |
|------|--------|
| **Two full boxes** | Field report + Linked evidence = **equal-height panes** |
| **All the way right** | Grid **100% width** of Evidence content; 50/50 to the right edge (inside normal padding) |
| **Fill the page down** | Panes grow to use viewport below back bar + title — not a postage stamp floating in void |
| **No scroll into blank** | Narrative stays fixed rows; linked-evidence scrolls **only when many clips** — not empty flex grow |
| **Empty linked evidence** | Still one-line “No evidence linked yet” — but inside a **full-height right pane**, not a tiny card floating in void |

---

## Recommended MOB

**Name:** `CASE-FILES-DETAIL-FILL-SPLIT-V1`

### In scope

1. Detail mode: panel + `#cf-detail-wrap` + `.cf-detail-grid` → **`width: 100%`**, **`flex: 1`**, **`min-height: 0`**, fill below hub nav.
2. Grid: **`align-items: stretch`**; both sections **`min-height: 100%`** of grid row.
3. **Equal two-pane chrome** — borders fill from left edge to right edge.
4. Narrative: keep **fixed rows** (no `flex: 1` textarea grow).
5. Linked evidence: **`flex: 1; min-height: 0; overflow-y: auto`** only on the evidence table area when rows exist; empty state compact inside tall pane.
6. Cache bust.

### Out of scope

- Changing field report fields / API
- Three-column layout
- Mobile redesign beyond existing `@media (max-width: 900px)` stack

### Risk

**Low–medium** — CSS only, but must **re-test** COMPACT-V1 pass criteria (no narrative scroll void).

### Verify

| # | Test | Pass |
|---|------|------|
| 1 | Open case → two boxes **same height**, span **full width** to right | ☐ |
| 2 | No dark void to the right of Linked evidence box | ☐ |
| 3 | Short narrative — **no** scroll into blank inside left box | ☐ |
| 4 | Many linked clips — scroll **inside** right box only | ☐ |
| 5 | Back bar + list still OK | ☐ |

---

## Agent pick

Apply **`CASE-FILES-DETAIL-FILL-SPLIT-V1`** — this is the missing half after COMPACT-V1: **fill width + equal panes**, without bringing back the skyscraper narrative bug.

---

## Ask

**`MOB-APPLY CASE-FILES-DETAIL-FILL-SPLIT-V1`**
