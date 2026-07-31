# MOB DISC — System-wide dark form controls (no white native patches)

**Date:** 2026-07-31  
**Status:** **APPLIED** via `UI-DARK-FORM-CONTROLS-UNIFY-V1` (2026-07-31) — awaiting operator PASS  
**Search:** white patch, select arrow, Choose file, form-control, color-scheme, appearance none  
**Operator:** Native browser **select** and **file** controls show light/white patches on dark UI — “super ugly.” Wants **one unified** look for the **whole system**, and every future control must follow it. Blend colours; still obvious what to click.  
**Evidence:** Screenshots — light gray select chevron strip; default light “Choose file” button on dark Analytics / Watchlist chrome.  
**Related:** `MOB-DISC-UI-DARK-FORM-CONTROLS-UNIFY-V1-APPLIED.md` · `public/css/settings-theme-unify.css` · `.form-control` in `global.css`

---

## Plain English

1. **Agreed.** Light native OS/browser chrome on dark Axiom screens is a product face FAIL — not a “browser quirk we live with.”  
2. **Root:** Windows Chrome/Edge still paints default **select** arrow wells and **file** “Choose file” buttons in light theme unless CSS forces dark (`appearance`, `color-scheme`, `::file-selector-button`).  
3. **Today’s mess:** Settings already has a partial dark file/select pass (`settings-theme-unify.css`). Analytics Watchlist / ANPR / other hub panels still leak native white patches. Scattered per-panel CSS = patch loops forever.  
4. **Fix once:** one **global** control skin in `global.css` that covers **all** dashboard `select`, `input`, `textarea`, and `input[type=file]` — then **new features inherit automatically**.

---

## Diagnosis (whole system)

| Surface | Typical leak |
|---------|----------------|
| Analytics Watchlist enroll (`#ax-bl-grade` etc.) | Select right-side light arrow well |
| Analytics Verify / ANPR / plate lists file inputs | Default light “Choose file” |
| Settings | Partially fixed already — must not regress; fold into global |
| Evidence / VC / fleet toolbars | Mix of hand-styled + native |
| Future MOB UI | Will reintroduce white patches unless global rule exists |

**Not fixed by:** random per-MOB `background:#0f172a` on the select body only (arrow button stays light).

---

## Design lock (PASS look)

| Control | Look |
|---------|------|
| Text / number / password / textarea | Dark field bg, muted border, light text (existing `--field-*` / `#0f172a` family) |
| **Select** | Same dark body; **no light chevron strip** — custom dark arrow (SVG/CSS) via `appearance: none` |
| **File** | No stock light “Choose file”; dark button + dark label; hover still readable |
| Focus | Accent border (existing focus ring) — clear “clickable / active” |
| Disabled | Dimmed, still dark (no white flash) |

**Still clear to click:** border + hover + focus + cursor pointer on file button / select. Blend ≠ flat invisible.

**Do not:** invent purple glow · switch product to light theme · rebuild every form as custom React widgets.

---

## Recommended MOB (one path)

### `UI-DARK-FORM-CONTROLS-UNIFY-V1`

| # | Change |
|---|--------|
| 1 | Add **system** rules in `public/css/global.css` for: `select`, `input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file])`, `textarea`, and `input[type=file]` + `::file-selector-button` / `::-webkit-file-upload-button` |
| 2 | `color-scheme: dark` on dashboard root (or `.enterprise-scope` / `body` as already partly done) so native bits prefer dark |
| 3 | Selects: `appearance: none` + dark custom chevron background; padding-right for arrow |
| 4 | File: dark button matching `.btn` / field tokens; kill light default |
| 5 | Scope: main dashboard (`index.html` + linked CSS). Login / setup pages: same tokens if they share `global.css` |
| 6 | Remove or thin **duplicate** per-panel white-patch hacks only where they fight the global rule (Settings unify stays compatible) |
| 7 | Cache-bust `global.css` |
| 8 | **Agent rule for later MOBs:** new selects/inputs/files use semantic classes only — **no** new light native chrome; rely on global skin |

**Do not:** redesign Analytics layout · change FR/ANPR business logic · one-off only Watchlist.

---

## PASS / FAIL

| Check | PASS |
|-------|------|
| Watchlist grade select | Dark arrow area — no light strip |
| Any file input on Analytics / Evidence / Settings | Dark “Choose file” (or equivalent) — no white button |
| Spot-check Ops / Settings / VC selects | Same dark family |
| Still obvious to click | Border / hover / focus visible |
| New feature later | Inherits without a special MOB |

---

## Operator decide

When ready:

- **`MOB-APPLY UI-DARK-FORM-CONTROLS-UNIFY-V1`**

**No code in this disc.**

---

## Lock record

| Item | Decision |
|------|----------|
| White native patches on dark UI | **Forbidden** product face |
| Fix style | **One global unify** — not panel-by-panel forever |
| Future controls | Must inherit global dark skin |
| Next MOB | **`UI-DARK-FORM-CONTROLS-UNIFY-V1` APPLIED** |
| Code | See APPLIED disc |
