# MOB DISC — What is “Hold To Talk”? · Who designed it? · Date check

**Date:** 2026-07-17  
**Status:** DISC — paper only — **no code**  
**Ask:** What does Hold To Talk do? Is it Call? Must hold? Who designed it? “I didn’t do this — agent overthinking.” By design Call should talk without holding. Check the date.

---

## Short answers

| Question | Answer |
|----------|--------|
| What is it? | Extra **hold button** on the **Call mic** path (`call-mic.js`) — mic only sends while you **press and hold** |
| Is it the Call function? | It is **Call’s mic UX**, not a separate product. Wrong UX vs your Call design |
| Must hold? | **Yes** with this button — by **your** design, Call should **not** require hold |
| Did you design it? | **No.** You **rejected** it |
| When did hold UI enter *this* tree again? | **2026-07-11** commit `3c865d9` (FR genre bulk) — **re-added** hold after rollback |
| Did Soft Open restore tonight invent it? | **No** — it was already in `main` since Jul 11 |

---

## Your design (locked)

From `docs/MOB-DISC-BWC-PTT-DURING-LIVE-CALL.md` (**2026-07-10**):

> `mob-call-mic-hold` **ROLLED BACK** (operator rejected; Call stays **always-on mic**).  
> **Do not propose hold-to-talk Call again.**  
> Call = continuous HQ mic when Call is active — not cartoon radio hold.

**By design (you):**

1. Press **Call** → session starts  
2. HQ mic is **open** (always-on) — **no** hold to talk to BWC  
3. Fleet **PTT** (separate) can still be hold-to-talk for 1:1 radio-style  

**Hold To Talk on Call** = agent idea (`mob-call-mic-hold`) to free PTT TCP for field→HQ. You said **no**.

---

## Date timeline (git)

| When | What |
|------|------|
| ~2026-07-02 | `b1027dc` — `call-mic.js` = **phone/always mic** style (no Hold To Talk UI) |
| **2026-07-10** | You reject hold Call → disc locks **ROLLBACK** / always-on |
| **2026-07-11** | `3c865d9` **lab-fr-genre** — `call-mic.js` **+136 lines** re-inserts `Hold-to-talk only (mob-call-mic-hold)` + floating **Hold to talk** button |
| 2026-07-17 Soft Open restore | Did **not** touch `call-mic.js` — only wall/player/broker/docker |

So: seeing Hold To Talk tonight is **not** Gold wipe and **not** Soft Open restore.  
It is **FR-genre commit smuggling rejected Call UX back in** on Jul 11 — agent/process fault relative to your Jul10 lock.

---

## What Hold To Talk does ( mechanika )

```text
Call session active
  └─ Floating button “Hold to talk”
       └─ Press → talking=true → mic frames → socket `call-audio` → BWC
       └─ Release → talking=false → mic silent to BWC (field can PTT up)
```

Comment in file today: *“frees PTT TCP for BWC → HQ when not holding.”*  
That was the agent’s reason. You already rejected that trade.

---

## Honest one-liner for you

**You are right — Call should be press Call and talk, no hold. Hold To Talk is agent `mob-call-mic-hold`, rejected 2026-07-10, wrongly put back in FR genre commit 2026-07-11.**

---

## Next (only if you want — named APPLY later)

Restore **always-on Call mic** (remove hold UI) — matches Jul 10 lock:

```text
MOB-APPLY call-mic-always-on-restore-jul10-lock
```

**APPLY done 2026-07-17:** `MOB-APPLY call-mic-always-on-restore-jul10-lock` — `call-mic.js` restored from `3c865d9^`; disc `MOB-APPLIED-CALL-MIC-ALWAYS-ON-RESTORE-JUL10-LOCK-20260717.md`.

Until a new named APPLY: **no freestyle edit** of `call-mic.js` / PTT cores.

---

## One line

**Hold To Talk = rejected agent Call hold UX, re-added 2026-07-11 in FR genre — not your design; Call-by-design = always-on mic after Call press.**
