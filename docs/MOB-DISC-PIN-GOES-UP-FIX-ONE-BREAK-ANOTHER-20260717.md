# MOB DISC — Pin goes up again (fix one, break another)

**Date:** 2026-07-17 ~23:55  
**Status:** DISC — paper only — **no code**  
**Operator evidence:** Screenshot — Chin pin popup sits **high** on Ops map (near top chrome / Fit pins bar), while wall Chin shows live; speaker unmuted (separate mute DISC).  
**Tone:** “Fix one dead another. Crazy fools. SIGH.”

**Search:** `pin goes up`, `pin crazy up`, `fan storm`, `dock`, `fix one break another`

---

## Short verdict

| Claim | Answer |
|-------|--------|
| Pin goes up = new tonight invent? | **Same class** as Soft Open **fan / dock / reopen storm** already disc’d earlier today |
| Did BWC-stop APPLY move pin layout math? | **No** — that APPLY did **not** edit `assignColocatedPinPopupDocks` / fan offsets / `PIN_DOCK_*` |
| Soft Open UI still in tree? | **Yes** — dock/fan lives in `dashboard-boot.js` + `index.html`; Soft Open pin MOBs already fought “KK pin crazy up” |
| Freestyle fix now? | **No** — Firmware Gold locks pin/wall; wait for **named MOB-APPLY** |

Accepted: you see pin **up**. Not arguing.

---

## What the screenshot shows

1. Ops map — Chin marker (Clementi area).  
2. Chin **pin popup** floating **high** (toward top nav / Fit pins), not parked beside the pin in a calm dock.  
3. Wall Chin tile live; pin has **Stop live**.  
4. Unmuted speaker on wall (mute sticky = other DISC — not this MOB).

This matches the earlier Soft Open soak wording: **“KK pin went crazy up”** — layout/fan/dock storm, **not** GPS marker teleport.

---

## Same known class (already on paper)

| Disc / APPLY | What |
|--------------|------|
| `MOB-DISC-SOFTOPEN-1H-SOAK-PIN-STOP-PANEL-20260717.md` | Operator: pin **crazy up** on Soft Open soak |
| `MOB-APPLIED-SOFTOPEN-REOPEN-NO-PIN-FAN-STORM-V1.md` | Keepalive reopen must **not** rebuild / fan-jump pin |
| `MOB-DISC-MAP-PIN-DOCK-GAP-2.md` / fan / stack discs | Dock stagger / fan offsets in `index.html` + `dashboard-boot.js` |
| Firmware Gold lock | Do **not** freestyle `video-wall` pin attach / mirror without naming file + APPLY |

---

## Tonight’s BWC-stop APPLY — honest scope

`MOB-APPLIED-BWC-STOP-NEVER-AUTO-CALLBACK-20260717.md` only:

- `liveStreamPool.onRemoteBye` clear watching  
- Gate re-invite while Stopped by BWC  
- Cache bust `video-wall.js`

It **did not** change:

- `assignColocatedPinPopupDocks`  
- `autoFanStackedPopups` / `fanDist`  
- `PIN_DOCK_*` in `index.html`  
- Soft Open reopen chrome (already supposed to be quiet)

So: **pin-up is not “the BWC-stop patch moved Y by 400px.”**  
Likely: **leftover Soft Open / dock / expand / triple-sync coupling** still in the live tree, or dock firing after live open / panel sync — **same fools class**, not a new death-rule cheat inside the toilet APPLY.

Still true: **fix one (toilet call-back) → another (pin chrome) still broken** because Soft Open + dock genre was never fully cleaned. That is process debt, not “toilet fix invented pin-up.”

---

## Why “fix one dead another” keeps happening

1. Soft Open patched **pin Stop / reopen / fan** on top of classic Fleet pin.  
2. Classic toilet latch was old (`b1027dc`) — separate from pin Y.  
3. Agents keep **narrow APPLYs** on coupled pin/wall without a full Soft Open UI freeze.  
4. Result: each named fix can leave **adjacent** pin chrome ugly while the named item improves.

Death-sentence reminder: **no freestyle pin dock patch** without you naming APPLY. Gold lock stands.

---

## Intended pin layout (lock)

| Mode | Expect |
|------|--------|
| Single Chin live | Pin popup **beside / calm** relative to marker — **not** jammed under top nav |
| Colocated Open All | Dock L/R (gap MOB) — not edge fan for n=2 |
| Soft Open reopen | **No** jump up / fan reset (already APPLIED; if still jumps = regress or leftover path) |

---

## Next (only when you say)

Park until named APPLY, e.g.:

- `MOB-APPLY pin-dock-no-top-jam-classic` — classic Chin-only pin Y/dock, **no** Soft Open reopen, **no** mute, **no** CallMic  
- Or Soft Open UI **freeze** + verify fan storm APPLY still in effect after hard refresh  

**Do not** bundle with mute or BWC-stop retest unless you list both APPLYs.

---

## Operator check (no APPLY)

1. Hard refresh once.  
2. Chin live only (kk offline OK).  
3. Does pin still sit under top bar? **Yes / No**  
4. Did you drag the popup earlier this session? (user-drag offsets stick)

Reply that; then name APPLY if still up.

**One line:** Pin-up = Soft Open / dock fan class still alive in tree — BWC-stop APPLY did not edit dock math; no code until you MOB-APPLY a pin-layout name.
