# MOB DISC — Floor destroyed · use baseline UX · only change video player

**Date:** 2026-07-20 ~23:51  
**Status:** LOCKED — stop stacking pin/layout MOBs  
**Operator:** *Fuck it. Use the baseline then change video player. Badly destroyed. Nothing works.*

---

## Verdict

**Yes.** That is the only sane path now.

Tonight’s pin MOBs (`PIN-FLV-MIRROR-HARDEN`, `PIN-FOCUSED-OPEN`, `PIN-BASELINE-OPEN-RESTORE`, chase/sync edits) **fought each other** on top of WVP. Result: **baseline pin/Call/layout feel destroyed**, handoff picture half-alive. More micro-patches will make it worse.

**Do not invent more pin layout.**  
**Do not park WVP.**  
**Reset pin/wall UX to baseline, then swap only the video player for WVP/ZLM.**

---

## What “use the baseline” means (locked)

| Keep from baseline (Firmware Gold / classic pin UX) | Change only for WVP |
|-----------------------------------------------------|---------------------|
| Pin open / auto-open with wall Live | Wall paint: FLV `<video>` instead of JSMpeg canvas |
| Fit pins / dock / colocated / Open All pin chrome | Pin picture: **mirror** that wall `<video>` (Gold mirror contract) |
| Call / PTT / Stop on pin | Later: listen path (named audio MOB) |
| Fleet roster / SOS / GPS | — |

**Baseline file of truth for pin/wall UX:**  
`baseline/2026-07-06-me8-firmware-gold/public/js/video-wall.js`  
(+ matching pin helpers in `public/index.html` only if Gold and live tree diverged on dock).

**Not:** full `RUN RESTORE-ME8-FIRMWARE-GOLD` unless you type that yourself — that wipe can drop today’s WVP handoff server/UI. Prefer a **named surgical MOB**.

---

## Why patch-on-patch failed

```
Gold pin UX  →  WVP wall player  →  pin mirror  →  “fix jump” killed open
             →  “restore open” half-back  →  Call/layout still wrong
```

Each MOB touched the same `video-wall.js` pin/open/dock/mirror paths. No clean floor left.

---

## One next APPLY (when you order it)

**`MOB-APPLY PIN-WALL-BASELINE-PLAYER-ONLY-V1`**

### Agent does (single MOB)

1. **Take** Firmware Gold `video-wall.js` pin/open/dock/focus/Open-All pin UX as the floor (surgical copy of those functions / structure — not a creative rewrite).  
2. **Re-graft only** today’s WVP pieces that paint picture:
   - handoff FLV attach on wall (`attachWvpHandoffFlv*`, `wvpHandoffFlvByCam`)
   - pin mirror from wall `<video>` (`wallMirrorSourceForCam` video-first, `startMapMirrorFromWall`)
   - cache bust  
3. **Do not** re-apply FOCUSED-OPEN “no auto-open”.  
4. **Do not** redesign Fit pins.  
5. **Do not** touch `lib/pttServer.js` / SIP cores unless you name them.  
6. Hard-refresh test note only — **no** “restart lab console” nonsense.

### PASS looks like

- Soft Open → wall Live → pins open like day‑1  
- Call / PTT / Stop on pin work  
- Pin shows same picture as wall (FLV mirror)  
- No agent “new layout”

### If still FAIL

Say what failed in one line. Next is **only** player/audio — not another open/dock invention.

---

## Agent forbidden until that APPLY

- More pin jump / dock / chase MOBs  
- “Small obvious” edits in `video-wall.js` pin paths  
- Asking you to pick A/B  

---

## One line

**Floor is toast from stacked pin MOBs. Next: baseline pin/wall UX + WVP video player only — `MOB-APPLY PIN-WALL-BASELINE-PLAYER-ONLY-V1`.**
