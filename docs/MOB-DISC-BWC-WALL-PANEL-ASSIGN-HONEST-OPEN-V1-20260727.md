# MOB DISC — BWCs “Video Wall (6/8 Panels)” confuses users

**Status:** APPLIED — see `MOB-APPLIED-BWC-WALL-PANEL-ASSIGN-HONEST-OPEN-V1-20260727.md`  
**Date:** 2026-07-27  
**Trigger:** Operator — Settings → BWCs button feels dead/wrong; high user confusion  
**Genre:** Settings BWCs entry → Ops wall **panel assignment** (not live video, not Command Wall)

---

## What the button actually does (code truth)

| Step | Code | Effect |
|------|------|--------|
| 1 | `#ss-open-video-config` click | Settings handler |
| 2 | `setOpen(false)` | **Closes** Server Config |
| 3 | `VideoConfig.openPanel()` | Shows `#video-config-backdrop` overlay |

That overlay is **panel assignment** (“which BWC / rotation mode for wall panel N”).  
It is the **same** UI as Ops wall rail **Config** (`#video-config-open`).

It is **not**:
- Live video wall playback
- Command Wall
- Opening map pins
- The BWC device list (that is the table on the same BWCs tab)

---

## Why it feels dead / wrong

1. **Lie in the label** — `server.openVideoWall` = “Video Wall (6 Panels)”; HTML fallback says “8 panels”; code supports **10** slots. Sounds like “open live wall.”
2. **Wrong mental model** — Users expect live pictures; they get a form overlay.
3. **Close Settings first** — If the Ops wall drawer is collapsed, or attention is still on “I was in Settings,” the overlay can look like **nothing happened**.
4. **Duplicate entry** — Same tool already exists as **Config** on the Ops wall; Settings button looks like a second “wall.”

---

## Product lock (what we keep)

- Panel assignment remains a real feature (fixed / group / list / overflow per panel).
- Ops wall **Config** stays.
- Do **not** turn this button into Command Wall or a new live player.
- Do **not** park / remove the Settings entry without a honest replacement path.

---

## Recommendation (one MOB)

**`MOB-APPLY BWC-WALL-PANEL-ASSIGN-HONEST-OPEN-V1`**

### Scope (only this)

1. **Rename** button + i18n key meaning:  
   e.g. **“Assign wall panels…”** (not “Video Wall (6/8 Panels)”).  
   Drop false panel count from the button label (or say “panels 1–10” only if we keep a count and match `SLOT_COUNT`).
2. **One-line hint** under BWCs actions:  
   “Opens panel assignment on the Operations wall — same as wall **Config**. Does not open live video.”
3. **Honest open path:** on click  
   - close Settings  
   - switch to Operations / map view if needed  
   - **expand / show** the video wall drawer if collapsed  
   - then `VideoConfig.openPanel()`  
   so the overlay is always visible.
4. Cache bust + short verify script.  
   Touch: `server-setup.js`, `en.json` (+ other locales if key exists), maybe tiny CSS/hint in `index.html`.  
   **Do not** rewrite `video-config.js` row logic or wall player.

### Out of scope (later, separate MOB if needed)

| Item | Why later |
|------|-----------|
| Embed full assign UI inside Settings (no leave Settings) | Bigger layout MOB |
| Unify 6 vs 8 vs 10 copy in all `video.wall.*` hints | Copy sweep after honest open PASS |
| Command Wall link from Settings | Different product surface |

---

## Operator PASS (after APPLY)

1. Settings → BWCs → button label no longer says bare “Video Wall (N panels)” as if live.  
2. Click → leave Settings → **see** panel-assignment overlay on Ops wall (not a blank “nothing”).  
3. Save/Cancel still works; Ops wall **Config** still opens the same overlay.  
4. Live wall / pin / Call / PTT unchanged.

---

## APPLY phrase

```text
MOB-APPLY BWC-WALL-PANEL-ASSIGN-HONEST-OPEN-V1
```
