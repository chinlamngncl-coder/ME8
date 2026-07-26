# MOB DISC — Ops left panel: unify button size to Open All / Clear map pins

**Date:** 2026-07-24  
**Status:** DISC only — **no code** until `MOB-APPLY OPS-LEFT-PANEL-BTN-COMPACT-UNIFY-V1` (name draft)  
**Operator:** Left panel “tabs” (buttons) look too big → make them the **same size** as **Open All** and **Clear map pins**. Do not change anything else.

---

## Understanding

Reference size (already compact):

- **Open All (Up to 8)** — `#fleet-open-all-pins`
- **Clear map pins** — `#fleet-clear-pins`

Those two got an explicit compact override in `OPS-FLEET-PIN-BUTTONS-COMPACT-V1` (`public/css/global.css`): ~`padding: 4px 8px`, `font-size: 10px`, `min-height: 0`.

Most other left-sidebar buttons still inherit the enterprise design-system button:

- `.btn.btn-action` → `min-height: 32px`, `padding: 7px 14px`, `font-size: 12px`

That is why SOS row buttons (**Open incident files**, **Download CSV**, **Clear list**, **Reload list**) look fat — especially **Open incident files** wrapping to two lines. User Circle row has some local compact CSS, but **Open Circle** (`.btn-action`) can still pick up the 32px min-height from global rules.

**Ask:** Unify left-panel action buttons to the Open All / Clear map pins **visual size**. No logic change.

---

## Scope (locked — nothing else)

| In | Out |
|----|-----|
| Ops **left sidebar** button height / padding / font-size only | Map / wall / pin / live / PTT / SOS **behavior** |
| Match Open All + Clear map pins compact metrics | VC, Evidence, Tactical, Server Setup buttons |
| Optional: same compact for User Circle + SOS log action rows in that sidebar | Redesign layout, reorder, rename, new features |
| | Touching Firmware Gold cores |

**Not in this MOB:** AR circle-grab, in-video pins, User Circle logic, SOS ledger logic.

---

## Recommended APPLY (when you say go)

**Name:** `OPS-LEFT-PANEL-BTN-COMPACT-UNIFY-V1`

**One CSS path (pick this):** Extend the existing Ops compact pattern to the rest of `#sidebar` / left fleet+SOS chrome, e.g. rules scoped under the ops sidebar so:

- Same metrics as Open All / Clear map pins: `padding: 4px 8px`, `font-size: 10px`, `min-height: 0`, `line-height: 1.25`, compact radius  
- Covers at least: User Circle buttons, SOS log action buttons in that panel  
- Prefer **one sidebar selector** (e.g. `#sidebar .btn.btn-sm` or `#sidebar-rest .btn` + fleet circle) so we don’t chase IDs forever — still **ops sidebar only**

**Do not:** change global `.btn` for the whole app (would fat/thin wrong screens).

---

## Operator PASS

1. Ctrl+F5 Ops dashboard.  
2. Open All / Clear map pins height unchanged (still the reference).  
3. Save selection / Add to circle / Delete / Open Circle ≈ same height.  
4. Open incident files / Download CSV / Clear list / Reload list ≈ same height (no huge double-line block unless text is long — then still compact padding).  
5. Pin / PTT / Open All / SOS actions still work as before.

---

## Confirm

Say **OPS LEFT BTN COMPACT DISC OK** if this is the ask.  
Then when ready: **`MOB-APPLY OPS-LEFT-PANEL-BTN-COMPACT-UNIFY-V1`**.

Until APPLY — **zero file edits**.
