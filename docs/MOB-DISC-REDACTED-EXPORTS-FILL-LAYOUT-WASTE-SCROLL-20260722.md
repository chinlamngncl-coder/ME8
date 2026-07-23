# MOB DISC — Redacted exports: tiny box, wasted page, useless scroll

**Status:** APPLIED 2026-07-22 — see `MOB-APPLIED-REDACTED-EXPORTS-FILL-LAYOUT-V1-20260722.md`  
**Mode:** Applied — `MOB-APPLY REDACTED-EXPORTS-FILL-LAYOUT-V1`  
**Search:** `wasted space`, `scroll right nothing`, `redacted exports layout`, `280px`, `fill page`  
**Trigger:** Operator screenshot — Redacted exports list short; empty dark area below; vertical scroll; horizontal scroll to empty; left/right gutters feel useless  
**Genre:** Evidence UI layout only (not blur quality / Finalize)

---

## Straight verdict — yes, got what you mean

| What you see | Truth |
|--------------|--------|
| Short table, big empty space below | **Real bug / leftover CSS** — list is capped at **280px** |
| Scroll on the right with few files | Scroll is on that **tiny box**, not “page full of rows” |
| Scroll right → nothing useful | Table/wrap overflows wider than the box; extra width is **padding / nowrap / column sprawl**, not hidden data |
| “Left and right level useless — put all files in one box” | Correct product ask: **one filled list panel** (like Library), not a postage-stamp table floating in empty page |

**Not** a data bug. Files and Download/Open source are fine. **Layout only.**

---

## Root cause (checked in code)

Shared class:

```css
.ss-evidence-table-wrap { max-height: 280px; overflow: auto; … }
```

| Panel | Override? | Result |
|-------|-----------|--------|
| **Evidence Library** (`#ev-panel-catalog`) | Yes — `max-height: calc(100vh - 220px)` | Fills most of the page |
| **Case files** list | Yes — flex + `calc(100vh - 320px)` | Fills |
| **Redacted exports** | **No** — still default **280px** | Short box + inner scroll + empty below |

So Redacted exports was wired for search/Download (`mob-evidence-redacted-exports-browser-v1`) but **never got the same fill-height treatment** as Library / Case Files.

Horizontal waste / “scroll right for nothing”:

- Long redacted + source names + 7 columns + `white-space: nowrap` on Detail buttons  
- Wrap is `overflow: auto` → horizontal bar even when the useful content already fits the eye  
- Page gutters (`#evidence-panel` padding) make the short box look even more “floating”

Outer Evidence panel can also scroll (`overflow-y: auto`) while the inner list stays 280px — double confusing scroll story.

---

## What “good” looks like (PASS)

| # | Behaviour | Pass |
|---|-----------|------|
| 1 | Redacted exports list **fills** the space under filters (to bottom of Evidence view) | ☐ |
| 2 | With few rows: **no** vertical scrollbar on the list (or thumb shows almost full) | ☐ |
| 3 | When rows exceed the filled height: **then** vertical scroll inside the list box | ☐ |
| 4 | One clear bordered list box — not a short strip + empty void | ☐ |
| 5 | No pointless horizontal scroll; long names wrap or ellipsis; Download / Open source stay visible without sliding right into blank | ☐ |

---

## Recommended MOB (one APPLY)

**Name:** `REDACTED-EXPORTS-FILL-LAYOUT-V1`

### In scope

1. **Fill height** for `#ev-panel-redacted-exports` — same idea as catalog: panel flex column; `.ss-evidence-table-wrap` grows (`flex: 1; min-height: 0; max-height: none` or `calc(100vh − chrome)`).  
2. Scroll **only inside** that filled box when content overflows.  
3. **Kill useless horizontal scroll:** `table-layout: fixed` (or column max-widths), wrap/ellipsis long file names, keep Detail actions in view (`white-space` only where needed).  
4. Optional polish: make the wrap look like one solid “files box” (already has border; ensure full width of content column).  
5. Cache bust.

### Out of scope

- Blur / face quality (`REDACT-FACE-QUALITY-KNOBS-V1`)  
- Prior exports cleanup (already APPLIED)  
- Changing columns/API/search behaviour  
- Redesigning whole Evidence theme  

### Risk

**Low** — CSS / light HTML structure on one panel. Catalog already proves the pattern.

### Files likely touched (when APPLY)

- `public/index.html` — CSS for `#ev-panel-redacted-exports` (+ maybe small wrap class)  
- Cache on `evidence-hub.js` only if needed for bust; logic change unlikely  

---

## Operator today (before APPLY)

No workaround that fills the page — the 280px cap is in CSS. Use the list as-is for Download / Open source; ignore empty space below until this MOB.

---

## Related

- Feature land: `MOB-APPLIED-EVIDENCE-REDACTED-EXPORTS-BROWSER-V1.md`  
- Catalog fill precedent: `#ev-panel-catalog .ss-evidence-table-wrap` in `public/index.html`  
- Not this: face miss refine → `MOB-DISC-REDACT-FACE-QUALITY-MISS-REFINE-20260722.md`

---

## Ask

When ready:

**`MOB-APPLY REDACTED-EXPORTS-FILL-LAYOUT-V1`**
