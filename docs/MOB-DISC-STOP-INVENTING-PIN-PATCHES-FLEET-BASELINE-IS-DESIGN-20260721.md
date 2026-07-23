# MOB DISC — Stop inventing pin patches · Fleet / baseline already is the design

**Date:** 2026-07-21 ~01:10  
**Status:** LOCKED DISC — **no APPLY**  
**Operator:** *Why are you thinking and patching again. We do not need to do this. It is on Fleet design and baseline.*

---

## Verdict (agent wrong habit)

| Agent habit tonight | Truth |
|---------------------|--------|
| Invent new MOB names (`FORCE-START-VIDEO…`, `NO-TOPLEFT-DOCK…`, chase, FOCUSED-OPEN, …) | **Wrong.** That is redesigning pin UX. |
| Treat each FAIL as a new invention | **Wrong.** Product law is already in **Fleet + baselines**. |
| What we need | **Stop scarring.** Bring live pin **behavior** back to classic/Gold. WVP may change **only** how pixels paint (wall FLV + mirror). |

You are correct. We do **not** need a new pin product. We need live to **match Fleet design that already passed**.

---

## What Fleet / baseline already owns (do not reinvent)

Confirmed in **classic-pass** and **Firmware Gold** `index.html` / `video-wall.js`:

| Function | Already designed |
|----------|------------------|
| Click map pin | `openPopup` → `afterMarkerPopupReady` / `playMapPinVideoIfPopupOpen(camId, …, { forceLive: true })` |
| Pin live | Start stream for **that camId** + show picture (classic: wall + pin JSMpeg / mirror from wall canvas) |
| Dock | `assignColocatedPinPopupDocks` — **classic** colocated layout (not a WVP invention) |
| Stop on pin | Minimize pin; wall stays (Firmware Gold / stopPinLive contract) |
| Open All / ensure popups | Baseline helpers — already compared identical for open helper |

**Baselines agree on pin UX.** Earlier triple-compare said: live scar is attach/mirror/player drift — **not** “Fleet never had pin-first.”

---

## What WVP is allowed to change (only this)

| Allowed | Forbidden |
|---------|-----------|
| Wall paint = WVP FLV `<video>` instead of JSMpeg canvas | New click / dock / “no top-left” product rules invented in chat |
| Pin paint = **mirror that wall surface** (canvas or video) | Second FLV on pin |
| Server `start-video` → handoff instead of Fleet INVITE | Killing baseline pin open to “fix jump” |
| | Stack of one-off pin MOBs that rewrite Fleet UX |

WVP = **video pipe**. Fleet = **ops UI contract**. That was the lock all along (`WVP finish no park`, harm plan, firmware gold).

---

## Why tonight still looks “fucked up”

Not because baseline design is missing.

Because **live left baseline**:

1. Handoff wall is `<video>` — pin must mirror it (player graft).  
2. Agents kept **editing** pin attach / dock / open instead of **linking baseline bodies** and grafting paint only.  
3. Invented test rituals (panel then pin) and invented MOB names — that is **patch thinking**, not Fleet restore thinking.

Log proof (restart OK, pin click still no `start-video`) means live play path **diverged** from classic `playMapPinVideoIfPopupOpen` chain — **restore that chain**, don’t invent `FORCE-START-VIDEO-AND-NO-TOPLEFT`.

Top-left snap under handoff is **dock called too often / wrong timing** on a WVP prove storm — classic dock math itself is still the design; fix is **stop live-only storms**, not invent a new dock product.

---

## Agent must stop

- Naming new pin UX MOBs every FAIL  
- “One more harden” that rewrites click/dock  
- Panel-first workarounds as product  
- Asking you to choose patch menus  

## Agent must do (when you APPLY — restore framing only)

**Not:** invent `PIN-CLICK-FORCE-…-NO-TOPLEFT-…`  

**Yes:** one restore-style MOB, e.g. when you order:

**`MOB-APPLY PIN-FLEET-BASELINE-PLAYER-ONLY-RESTORE-V1`**

Meaning (locked intent — not new design):

1. Re-link **classic-pass / Gold** pin click → `playMapPinVideoIfPopupOpen` / `attachMapPopupPlayer` / dock call pattern from baseline (Fleet design).  
2. Keep **only** WVP player delta: wall FLV + `wallMirrorSourceForCam` / mirror from `<video>`.  
3. No hardcoded Chin/kk. No new dock algorithm. No FOCUSED-OPEN.  
4. Diff against `baseline/2026-07-18-classic-pass` (and Gold for pin mirror) — live must match UX; paint source may differ.

Until you say that APPLY (or an exact restore name you choose), **no more pin code.**

---

## Bottom line

**Fleet + baseline already define pin click, live, dock, stop.**  
**WVP only changes the paint pipe.**  
**Tonight’s failure is live scar + agent inventing patches — not missing design.**  
**Next work = restore baseline Fleet pin path + keep WVP player only — not another invented patch.**
