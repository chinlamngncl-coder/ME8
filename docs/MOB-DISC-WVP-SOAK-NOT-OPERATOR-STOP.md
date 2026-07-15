# MOB DISC — You did not click Stop; end was still a client/WVP stop

**Date:** 2026-07-15  
**Operator:** “I did not stop. I put it there to run.”  
**Corrects:** earlier line that 23:57–58 was “you/stop path”  
**Status:** FACTS + discussion — no code

---

## Believe you

You left the soak running. That is taken as fact.

**Still true in the log:** at ~23:57–58 something **did** stop the play from the **browser/WVP API side** — not “random ZLM death,” and **not** the same mid-soak cam BYE.

Sorry for saying “you stopped.” Better: **you did not mean to stop; the stack still ran a stop.**

---

## Two different events (keep separate)

| When | Who moved first | What log says |
|------|-----------------|---------------|
| **~23:32** mid (~1 min hole) | **Cameras** | WVP `[收到bye]` PLAY from kk/chin → RTP down → later re-点播 |
| **~23:57–58** “end” | **Browser player + WVP stop API** | See below — **not** cam BYE first |

---

## Exact order at “end” (~23:57)

1. **23:57:57.217** ZLM: FMP4 player for kk  
   `断开: recv close request from client`  
   → **browser/Lab closed the media HTTP connection**
2. **23:57:57.352** WVP (HTTP thread): `[停止点播/回放/下载]` kk  
   then WVP `[发送BYE]` **to** the cam (platform hangs up)
3. ~3 s later: same for chin

So: **player socket closed → WVP stop play API → BYE to cams.**  
That matches Lab calling `/api/lab/wvp/stop` (or equivalent), **or** tab/page teardown — not you pressing a Stop button you remember.

Possible causes (not proven yet which one):

- Tab sleep / browser discard / laptop sleep  
- Page navigate / refresh / auth bounce  
- Lab tile JS on player error → cleanup → stop  
- Viewer gone → WVP/hook close (less likely as first line; first line is **client** close)

Next soak prove: leave PC awake, tab focused; if end still hits same pattern → dig Lab tile auto-stop; if not → machine sleep.

---

## What this means for “how to solve”

1. **Mid ~1 min (~24 min mark)** — still **cam SIP BYE** → cam session limit and/or Lab fast re-play (`MOB-DISC-WVP-MID-SOAK-BYE-FIX.md`).
2. **“End” while you meant keep running** — treat as **unintended client stop**, not operator fail. Fix candidates later:
   - Lab: do **not** call stop on every player blink if intent is soak  
   - Or: on stop unexpected → auto re-play (same as mid-BYE soft fix)  
   - Soak discipline: prevent sleep / never reload

---

## One line

**You didn’t click Stop; logs still show the browser closed the stream then WVP stopped play and BYE’d the cams — mid break = cam BYE; “end” = client/WVP stop without your intent.**
