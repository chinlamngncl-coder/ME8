# MOB DISC — Select caret still invisible (operator FAIL)

**Date:** 2026-07-31  
**Status:** DISC only — **no code until** `MOB-APPLY` named below  
**Operator:** Hard FAIL — List grade / Reason still look like plain dark fields; **no grey ▼ visible** (screenshot 2026-07-31)  
**Previous MOB:** `ANALYTICS-GRADE-FILTER-COMPACT-CHEVRON-V1` — claimed dark field + grey caret — **did not pass eyes**  
**Related:** `MOB-DISC-ANALYTICS-GRADE-FILTER-COMPACT-CHEVRON-20260731.md`

---

## What you see (locked)

- **List grade** = “Suspicious” in a dark box — **no arrow**  
- **Reason** = “Suspicious behaviour” — **no arrow**  
- Reads as a **static tab / text field**, not a dropdown  

Agent said “grey ▼ on the right.” Operator cannot see it. That is FAIL — not a soft maybe.

---

## Why the last fix failed (checked in code)

1. **Caret is only a `background-image` SVG on `<select>`** after `appearance: none` (`--select-chevron` in `global.css`).  
2. That pattern is **unreliable** on real Chromium/Windows form controls — paint can be missing even when CSS “looks” correct in source.  
3. The SVG itself is a **weak / bad path** (points outside `viewBox 0 0 12 8`) and fill **`#94a3b8`** (slate) on **`#0f172a`** — low contrast even if it did paint.  
4. Tweaking the same `background-image` again is **hope**, not a product fix. Disc exists to stop repeating that.

Compact width from the last MOB can stay. **Visibility of “this is a dropdown” did not ship.**

---

## What we will do (one recommendation — not pick-A/B)

### Named APPLY

**`SELECT-CARET-VISIBLE-OVERLAY-V1`**

### Fix method (reliable)

Stop depending on `select { background-image: svg }` as the only caret.

1. Add shared wrap class **`.ax-select-wrap`** (position relative, inline-block, width of select).  
2. Put Analytics **List grade / Reason / enroll selects / All grades filter** (and Watchlist grade/reason/filter — same UI) inside that wrap.  
3. Draw caret with **`::after` CSS triangle** (or small SVG node) on the wrap — `pointer-events: none`, sits on the **right** of the control, **above** the select.  
4. Colour: **light slate `#e2e8f0`** (clear on dark) — not faint `#94a3b8`. Size large enough to see at a glance (~8–10px wide).  
5. Keep field **dark** — no white OS arrow patch. Keep `appearance: none` + dark `background-color`.  
6. Cache-bust CSS/HTML.

**Why this:** Overlay caret always paints; does not fight native select background layers.

### Scope this MOB

| In | Out |
|----|-----|
| Analytics Plate lists + Watchlist enroll selects + grade filters (operator surface) | Redesign forms |
| Shared `.ax-select-wrap` in `global.css` for reuse | New custom JS dropdown component |
| Brighter visible caret | Another invisible SVG-on-select-only hope |
| | Merging ANPR into FR |

**Whole software later:** Same wrap class — apply to Settings / Evidence selects in a **follow-up named MOB** after operator PASS on Analytics. Do not claim whole-console PASS until those are wrapped too. This MOB = **prove caret visible where you failed the pic first**.

### Operator PASS

1. Hard refresh.  
2. ANPR → Plate lists → **List grade** and **Reason** show a **clear light ▼** on the right.  
3. Click still opens native options (dark list).  
4. No white arrow well.

---

## Memory (agents)

- “CSS says chevron” ≠ “operator sees chevron.”  
- Verify with eyes / screenshot.  
- Prefer **overlay caret on wrap** for Axiom dark selects.  
- Never ship `#94a3b8` micro-SVG on select as the only affordance again without PASS.

---

## APPLY line

```
MOB-APPLY SELECT-CARET-VISIBLE-OVERLAY-V1
```
