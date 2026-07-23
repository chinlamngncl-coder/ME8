# MOB-DISC — Why not A/B/C again; baseline link instead

**Date:** 2026-07-20  
**Status:** DISC only — **no restore / no code** until you name it  
**Your point:** “I already have all these done — why again? Just take the baseline and link.”

---

## Direct answer

**You are right. We should not invent A / B / C as if the lab never did contact, dual-reg, or 29201.**

Those options were agent noise after the log proof. They are **not** the next product step.

What you already locked:

| Asset | Role |
|-------|------|
| **`me8-classic-pass-20260718`** | Known **Classic Fleet PASS** floor — PTT/Call felt good with **native 29201** |
| Snapshot | `baseline/2026-07-18-classic-pass/` |
| Restore phrase | **`RUN RESTORE-ME8-CLASSIC-PASS-20260718`** only when **you** type it |
| Includes | `server.js`, `lib/pttServer.js`, `public/js/video-wall.js`, … |

Agent should **link / selective-restore from that baseline** for the voice stack — not redesign SIP home or re-ask you to “do dual-reg again.”

---

## Why it still fails *now* (without redoing your lab)

1. **Code restore we already did** put Fleet back on `ptt-wake` → `group config sent` gtid **49** / **29201**. Logs prove emit works.  
2. **Cams still never `login ok` on 29201** → UI never reaches `ptt-start`.  
3. **Classic-PASS baseline was taken with lab WVP off** (`FM_LAB_WVP=0` in that snapshot) — Soft Open / WVP storm **before** clean WVP/ZLM return.  
4. **Today’s tree** keeps **WVP on** for live + cold SOS. That is a **different topology** than classic-PASS. Linking classic **PTT files** alone does not magically make a WVP-homed cam open HDA TCP — but inventing new “proof / dual-reg” MOBs is still the wrong agent move when your answer is **baseline link**.

So: failure ≠ “you forgot dual-reg.” Failure ≠ “need another architecture paper.”  
Failure = **current ME8 + WVP lab diverged from classic-PASS; fix by baseline link (or full classic restore), not by reinventing.**

---

## What “take the baseline and link” means (plain)

| Mode | What | Keeps WVP live/SOS? |
|------|------|---------------------|
| **Full classic restore** | You type `RUN RESTORE-ME8-CLASSIC-PASS-20260718` → whole product tree from snapshot | **No** — classic floor = WVP lab **off**; you lose today’s WVP live/SOS wiring |
| **Selective link (preferred if you want both)** | Named APPLY: copy classic-PASS **PTT/Call surface** files into live tree only | **Yes** — leave WVP video + SOS alone |

Selective link candidates (classic → live), **only after you APPLY a named MOB**:

- `lib/pttServer.js`
- PTT/Call socket + `pushPttGroupForCamera` region in `server.js` (or whole `server.js` if you accept wider blast)
- `public/js/video-wall.js` PTT hold/wake (or whole file + cache bust)
- **Not** blindly: Firmware Gold pin cores, SOS event bus, ZLM lobotomy — unless you order full classic

Agent does **not** auto-run full restore. You must type the RUN phrase for full; for selective, say a named APPLY.

---

## What we abort (agent side)

- **A / B / C** from `MOB-DISC-NATIVE-29201-RESTORED-STILL-DEAD` — **parked / cancelled as menus**  
- New “contact proof” / “dual-reg again” APPLYs unless **you** name them  
- Re-opening WVP VoiceAdapter as product talk (ARCH cancel stays) unless **you** cancel that ARCH  

---

## Honest trade-off (one line)

Classic-PASS **PTT PASS** and **current WVP live/SOS PASS** were never the same snapshot. Linking classic PTT is the right **code** move; if ear still dead after a clean classic PTT link with WVP still on, the gap is **topology**, not missing baseline — and then you choose full classic restore vs keep WVP and accept a later named path. We do **not** pretend A/B/C are required first.

---

## Your call (no code until you say it)

1. **`MOB-APPLY-LINK-PTT-FROM-CLASSIC-PASS-V1`** — selective file link from `baseline/2026-07-18-classic-pass` (PTT/Call only; keep WVP live/SOS).  
2. **`RUN RESTORE-ME8-CLASSIC-PASS-20260718`** — full floor (you type exact phrase).  
3. Stay as-is and only paper — no change.

**No code in this MOB.**
