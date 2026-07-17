# MOB DISC — Call button always-on = long-term concept (not old Gold restore)

**Date:** 2026-07-17  
**Status:** DISC — paper lock  
**Related APPLY:** `MOB-APPLY call-mic-always-on-restore-jul10-lock`  
**APPLIED:** `docs/MOB-APPLIED-CALL-MIC-ALWAYS-ON-RESTORE-JUL10-LOCK-20260717.md`

---

## Operator question

> No other old restore right? Only Call button as per long-term concept. For ~2 months we had this function.

**Answer: Yes.**

| Claim | Truth |
|-------|--------|
| Other old restore (Firmware Gold / Pre-Gate-C / full tree / Soft Open wipe)? | **No** — none of that in this APPLY |
| What was restored? | **Only** `public/js/call-mic.js` (plus `index.html` cache bust) |
| Product concept? | Long-term **Call button** = press Call → **always-on mic** (phone-style), **no** Hold To Talk |
| How long has that been the design? | **~2 months** in lab practice; locked on paper **2026-07-10** (`MOB-DISC-BWC-PTT-DURING-LIVE-CALL.md`) |

---

## Long-term Call concept (yours)

```
Live / wall up
  → press Call
  → HQ mic ON continuously
  → talk to BWC without holding any extra button
  → End Call → mic OFF
```

That is the **Call** function you have been using. It is **not**:

- Fleet **PTT** hold-to-talk (that stays in `ptt-mic.js` — separate)
- Soft Open / WVP / Gold pin-mirror restore
- A return to July-6 Firmware Gold or July-14 Pre-Gate-C trees

---

## What this APPLY did / did not

### Did (narrow)

- Put `call-mic.js` back to pre–`3c865d9` always-on path (git blob from `3c865d9^`)
- Bust cache so the browser drops the Hold To Talk chrome

### Did **not**

- `RUN RESTORE-ME8-FIRMWARE-GOLD` or any Gold pack restore  
- Pre-Gate-C / POC demo / Trial Gold full restore  
- Soft Open storm restore of wall / player / broker  
- Touch `pttServer.js`, `ptt-rx.js`, `ptt-mic.js`, `video-wall.js`, `server.js`, redact/FR  

---

## What went wrong (Hold To Talk)

| Item | Note |
|------|------|
| Your Call design | Always-on after Call — ~2 months |
| Agent idea `mob-call-mic-hold` | Rejected **2026-07-10** |
| Hold UI reappeared | Smuggled in **2026-07-11** FR genre commit `3c865d9` |
| Soft Open work tonight | Did **not** invent Hold — it was already wrong in `main` |

Tonight’s APPLY only **undid that wrong Call mic UX** — back to your long-term Call button.

---

## Lock

- Call = always-on mic after **Call** — do **not** propose Call hold-to-talk again  
- Do **not** treat this as permission for broad “old restore” without a **named** MOB-APPLY  
- PTT hold remains PTT-only  

**Search:** `Call always-on`, `call button long-term`, `not Gold restore`, `call-mic-always-on-restore`
