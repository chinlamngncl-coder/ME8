# MOB DISC — Evidence detail UI: stop full-width blue bars · label Evidence ID

**Status:** **APPLIED** 2026-07-16 — `mob-evidence-detail-compact-actions-v1`  
**Applied:** `docs/MOB-APPLIED-EVIDENCE-DETAIL-COMPACT-ACTIONS-V1.md`  
**Date:** 2026-07-16  
**Search:** `evidence detail UI`, `full width blue`, `university project`, `EV- id`, `controlled preview`  
**Operator:** Same complaint again — do not fill the whole row with a blue tab. Unify with well-done pages. What is `EV-…`? Header or remove.

---

## Problem (from screenshot)

Evidence file detail (`#ev-panel-detail`):

1. **Open Preview** and **Export trimmed clip** stretch as **page-width blue bars** (university / form-stack look).
2. Under the filename, bare `EV-MRAR5LWM-93d1392f` with **no label** — looks like junk.

Operator rule (locked tone): **content-sized** `btn-action btn-sm` chips — not full-row primary bars. Said many times.

---

## What `EV-…` is (not useless)

| Item | Fact |
|------|------|
| Value | Catalog **Evidence file id** from `lib/evidenceRegistry.js` → `newFileId()` |
| Format | `EV-` + base36 time + `-` + 8 hex (example: `EV-MRAR5LWM-93d1392f`) |
| Role | Stable id for API, custody, case link, audit — **not** a human case title |
| Not | Court “case number” you type; not export id (`EXP-…`); not attachment (`ATT-…`) |

**Decision (proposed):** **Keep it** — removing breaks support/audit (“which file?”).  
**UI fix:** show with existing label **`Evidence ID`** (`evidenceHub.fileId` / `evidence.colId` already in locales). Today detail head dumps bare `<code>f.id</code>` with no header — that is the bug, not the id itself.

---

## Why buttons go full width

Global CSS:

```css
.btn { … width: 100%; … }
```

Well-done panels **override** to `width: auto` (same product theme):

| Good reference | Where |
|----------------|--------|
| Analytics / FR alarm actions | `#app-view-analytics .btn` → `width: auto` (`index.html` ~1157–1166) |
| Server Config | `#server-setup-panel .btn` → `width: auto` |
| Evidence **settings** / case-file head | already compact in places |
| Evidence **detail** preview / trim / side | **missing** that override → inherits 100% |

So this is not a new design system — Evidence detail was left off the compact rule everyone else uses.

---

## Unify target (no inventing)

Match **FR / Server Config / Settings lifecycle** compact CTAs:

- `btn btn-action btn-sm` / `btn btn-ghost btn-sm`
- `width: auto; flex: 0 0 auto; white-space: nowrap`
- Actions in a **flex wrap row**, not stacked full-bleed bars
- Preview: short **Open Preview** chip under the locked note (not a blue highway)
- Trim: **Export trimmed clip** sits beside In/Out as a chip (bar can stay a panel; button must not span 100%)

**Do not** copy SOS detail stretch-flex-1 bars — those are weaker for this complaint.

---

## Proposed MOB (when you say APPLY)

**Name:** `mob-evidence-detail-compact-actions-v1`

| Touch | Change |
|-------|--------|
| `public/index.html` | CSS: apply Analytics-style compact `.btn` under `#ev-panel-detail` (preview actions, trim bar, side meta, export row) |
| `public/js/evidence-hub.js` | Detail head: label **Evidence ID** above/beside `<code>f.id</code>`; optional tiny flex wrap for side action buttons if markup needs a wrapper |
| `public/locales/en.json` | Only if a new short hint string is needed (prefer reuse `evidenceHub.fileId`) |

**Out of scope (at time of detail MOB):** wall / pin / PTT / SIP; rename Axiom; change `EV-` id format; catalog table redesign.

**Follow-up APPLIED:** `mob-evidence-redact-compact-actions-v1` — same compact rule on `#ev-panel-redact` (Save redacted = chip, not full blue bar). See `MOB-APPLIED-EVIDENCE-REDACT-COMPACT-ACTIONS-V1.md`.

**Pass:** Open Preview + Export trimmed clip look like FR/Settings chips; Evidence ID has a visible header; no full-width blue tab across the preview pane.

---

## Related

- In-app redact flow (separate): `MOB-DISC-EVIDENCE-REDACT-IN-APP.md`
- Face-follow burn (separate genre): `MOB-APPLIED-EVIDENCE-REDACT-FACE-FOLLOW-V1.md`

---

## One line

**`EV-…` = auto Evidence ID (keep + label). Full-width blue bars = missing compact override — unify Evidence detail with Analytics/Server Config, not a new theme.**
