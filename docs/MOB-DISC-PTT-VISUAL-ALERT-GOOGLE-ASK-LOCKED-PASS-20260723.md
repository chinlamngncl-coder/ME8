# MOB DISC — PTT visual alert · Google ask locked · PASS

**Date:** 2026-07-23  
**Status:** PAPER lock — operator **PASS** on `PTT-VISUAL-ALERT-FULLSTACK-V1`  
**APPLIED:** `docs/MOB-APPLIED-PTT-VISUAL-ALERT-FULLSTACK-V1-20260723.md`  
**Operator:** Already had field-PTT chrome in the product. Google already explained the real gap. Do **not** reinvent or re-ask.

---

## Plain English (what you meant)

You are watching **live** bodycam video with **sound muted**.

The **officer** presses the **PTT (talk) button** on the bodycam.

The system must **alert you** (highlight that tile) so you know **who is talking** and can unmute if you want.

That is the whole feature. Nothing else.

---

## What Google already told us (same idea)

| Fact | Meaning |
|------|---------|
| No clean SIP “button down” | Device just sends PTT audio packets |
| Signal = `dwCMD == 130` (or legacy 4) | Already on PTT TCP path |
| HQ often muted | Must **see** talk, not only hear |
| Alert = tile pulse | Not auto-unmute; not a new app |

Google / prior discs already said this. Agents must not treat it as a mystery.

---

## What you already had (before this MOB)

The lab **already** had field-PTT UI pieces:

- `ptt-rx-state` from server when talk packets arrive  
- Fleet list yellow “PTT” row pulse  
- Banner / toast  
- Wall/map highlight — **but only when that tile was not in live video**

So “I already have this” is true for the **non-live** / list chrome path.

---

## What was actually broken (the only gap)

While the tile was **Live**, the wall code **refused** to show the talk highlight (`!liveActive`).

So the exact Google case — **live + muted + officer presses PTT** — looked like “nothing happens.”

**This MOB only fixed that gap** (plus ~0.8s clear + stronger pulse class). It did not invent a second PTT system.

---

## PASS meaning

Operator confirmed: with live muted, officer PTT → tile alerts. Good.

**Do not:**

- Rebuild Settings / invent a new alert product  
- Re-diagnose “how does PTT work?” from scratch  
- Re-open this MOB unless it **regresses**  
- Nag or ask “pick A or B” about this again  

---

## One line

**Google ask = live muted + officer PTT → alert me on that tile. You already had most of it; PASS closed the live-tile blind spot. Locked — no further work unless it breaks.**
