# MOB DISC — Case Files detail: no bottom line on boxes — phantom space below

**Status:** APPLIED — `CASE-FILES-DETAIL-BOX-CLOSE-V2` (2026-07-22; V1 FAIL on stretch)  
**Date:** 2026-07-22  
**Trigger:** Operator screenshot — Field report + Linked evidence panes stretch down; **no visible bottom border** in browser; feels like **something continues below** when it doesn’t. “Can’t you draw a line for both on the bottom?”  
**Search:** `cf-field-report border`, `FILL-SPLIT`, `viewport min-height`, `phantom scroll`  
**Related:** `MOB-APPLIED-CASE-FILES-DETAIL-FILL-SPLIT-V1` · `MOB-DISC-CASE-FILES-FORM-LEFT-ALIGN-20260722.md`

---

## Yes — we understand.

You want **two closed boxes** — top border, sides, **bottom border you can see** — right under the content. Not tall dark wells that imply more form below.

```
PASS — closed cards:
┌─ Field report ──────┐ ┌─ Linked evidence ──┐
│ Title…            │ │ Link bar           │
│ Narrative…        │ │ No evidence yet    │
│ Updated…          │ │                    │
└───────────────────┘ └────────────────────┘
        ↑ bottom line visible here

FAIL — today (FILL-SPLIT-V1):
┌─ Field report ──────┐ ┌─ Linked evidence ──┐
│ Title…            │ │ Link bar           │
│ Narrative…        │ │ No evidence yet    │
│ Updated…          │ │                    │
│                   │ │                    │
│   (empty void)    │ │   (empty void)     │
│                   │ │                    │
└─ line miles down ─┘ └─ line miles down ──┘
     ↑ feels like more content below — there isn’t
```

---

## What you’re looking at

**Case Files → open case** — two panes after `FILL-SPLIT-V1`.

| What you see | Truth |
|--------------|--------|
| No bottom line near content | Bottom border exists in CSS but sits at **bottom of viewport**, not under your fields |
| Dark area below “Updated” / “No evidence linked yet” | **Empty pane interior** — same colour as page (`#0f172a`) |
| Feels like scroll / more below | **Virtual** — `min-height: calc(100vh - 168px)` forces panes taller than content |

Border in code: `border: 1px solid #334155` — but when the box is **screen-tall**, the bottom edge is **off the visual “card”** in your head. You only see top + sides around the short content.

---

## Root cause

`CASE-FILES-DETAIL-FILL-SPLIT-V1` over-corrected:

```css
#ev-panel-case-files.cf-detail-active {
    min-height: calc(100vh - 168px);  /* forces tall panel */
}
.cf-field-report, .cf-linked-evidence {
    height: 100%;  /* stretch to fill viewport */
}
```

**Equal height** was requested — we made height = **viewport**, not height = **content**.

Correct equal height = **both panes match the taller content column** — not fill the screen with void.

---

## What PASS looks like

| Rule | Detail |
|------|--------|
| **Bottom line visible** on both boxes without scrolling |
| **Equal height** left/right — still yes, but **content-based** |
| **No phantom “more below”** | Dark void inside pane gone |
| **Many linked clips** | Right pane grows / scrolls **inside** only when needed |
| Works with **FORM-ALIGN-V1** (left rail) — separate MOB |

---

## Recommended MOB

**Name:** `CASE-FILES-DETAIL-BOX-CLOSE-V1`

### In scope

1. **Remove** viewport `min-height` on `cf-detail-active` panel (back to content-sized panel).
2. Grid: keep `align-items: stretch` — siblings equal height to **taller pane’s content**.
3. Panes: `height: auto` / `align-self: stretch` — **not** `height: 100%` of viewport.
4. Optional: `box-sizing: border-box`; ensure **border-bottom** visible (same `#334155` — works when box is short).
5. Linked evidence: internal scroll only when rows overflow a sensible max (e.g. `max-height` on table area when many clips).

### Out of scope

- Form field alignment (FORM-ALIGN-V1)
- List ghost column (done COL-FIT-V2)

### Risk

**Low** — CSS revert/tune of FILL-SPLIT viewport stretch only.

### Verify

| # | Test | Pass |
|---|------|------|
| 1 | Open case — **see bottom border** on both boxes near content | ☐ |
| 2 | No dark void suggesting more form below | ☐ |
| 3 | Left and right boxes **still same height** | ☐ |
| 4 | Link 10+ clips — scroll inside right box only | ☐ |

---

## Agent pick

**`CASE-FILES-DETAIL-BOX-CLOSE-V1`** — fixes bottom line + phantom void; keeps equal-height **between** the two panes, not equal-to-screen.

Apply **before or with** `CASE-FILES-FORM-ALIGN-V1` (align left rail).

---

## Ask

**`MOB-APPLY CASE-FILES-DETAIL-BOX-CLOSE-V1`**
