# MOB DISC — Screensaver vs mid-soak break; how to check

**Date:** 2026-07-15  
**Operator:** End at ~49 min **was me Stop**. Mid hole — maybe screensaver? Any way to check?  
**Status:** DISCUSSION + desk facts — no code  

---

## Settled facts

| When | Cause |
|------|--------|
| **~23:57 end** | **You stopped** — matches ZLM `recv close request from client` → WVP `[停止点播]` → `[发送BYE]` to cams |
| **~23:32 mid (~1 min)** | **Cams** `[收到bye]` first — then RTP down — then Lab/WVP **开始点播** again |

Prior doc that treated “end” as mystery client stop is **wrong for intent**; you meant to stop. Mid is the real question.

---

## Can screensaver cause the mid break?

### Short answer

**Possible for the browser blink / reopen delay — weak for the cam SIP BYE.**

Screensaver (or lock) can:

- Blank / lock PC → Chrome may throttle or pause the tab  
- Lab tile then sees stall / comes back on `visibilitychange` and **reopen** (~matches ~40–60 s hole)

Screensaver does **not** normally send **GB28181 BYE from the camera**. Mid log is still **`[收到bye]` from device** on both cams within ~8 s after ~24 min — that points at **cam/SIP session**, not Windows paint.

Sleep / Modern Standby **would** hammer the player harder — but we checked, and **none** around 23:32.

---

## What we already checked on this desk (2026-07-15)

| Check | Result around **23:20–23:40** |
|-------|-------------------------------|
| Windows **Kernel-Power** sleep / Modern Standby | **No** events in that window (last sleep earlier afternoon) |
| Security lock/screensaver audit **4800–4803** | **Empty** (often audit not enabled — cannot prove screensaver fired) |
| Power plan AC **Turn off display** / **Sleep** | Both **7200 s = 120 min** — longer than mid at ~24 min from play start |
| Registry `ScreenSaveActive` | **1** (screensaver **on**) |
| `ScreenSaveTimeOut` | Confirm on your PC in Settings → Personalization → Lock screen / Screen saver (desk script may not print timeout cleanly) |

So: **PC did not sleep at mid.** Screensaver **could** have blanked (audit blind). Even if it did, **cam BYE** is still the media-stop smoking gun.

---

## How to check next soak (operator + agent)

### A — Control test (best)

1. Before Play A+B: set screensaver **None**, display never off, sleep **Never** (AC).  
2. Leave mouse nudge or keep PC awake.  
3. Soak **60+ min**, you Stop only at end.  
4. Agent pulls WVP for `[收到bye]` / `[开始点播]`.

| Outcome | Meaning |
|---------|---------|
| Mid BYE **gone** | UI/power/screensaver (or luck) was involved — dig Lab visibility next |
| Mid BYE **still ~24 min** | **Cam/SIP session** — not screensaver |

### B — Windows proof if you want logs

- Settings → turn screensaver off for soak (simplest).  
- Optional: enable audit “Other Logon/Logoff Events” so **4802/4803** screensaver invoke/dismiss appear — then next mid we can correlate clock.  
- Event Viewer → Windows Logs → System → filter **Kernel-Power** (sleep).  

### C — Lab tile panel

On mid blink, look for lines like `Tile A: reopen #N` vs blank.  
- Reopen **without** WVP `[收到bye]` → player/UI.  
- `[收到bye]` then reopen → cam tore play; tile recovered.

### D — Agent post-soak (named later)

`mob-wvp-soak-bye-prove` — dump only BYE / 点播 / client-close lines + note whether Kernel-Power fired.

---

## What not to confuse

| Event | Screensaver likely? |
|-------|---------------------|
| Mid **cam BYE** | Unlikely root |
| Mid **~1 min black until reopen** | Possible **amplifier** if tab froze after cam already BYE’d |
| End Stop | You — ignore for “bug” |

---

## One line

**End = you Stop. Mid = cam BYE in the log; screensaver is on but PC did not sleep at 23:32 — prove with one soak screensaver/sleep off; if BYE repeats, fix cam/session, not screensaver.**
