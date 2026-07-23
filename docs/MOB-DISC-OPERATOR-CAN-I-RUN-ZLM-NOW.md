# MOB DISC — Can I run ZLM now? Just refresh?

**Status:** LOCKED 2026-07-16  
**Search:** `can I run zlm`, `just refresh`, `zlm now`, `sure?`  
**Plain voice:** `docs/MOB-DISC-OPERATOR-PLAIN-WVP-5061-NOT-YOUR-JOB.md`  
**5060 stays:** `docs/MOB-DISC-NO-DICTATE-CHANGE-5060.md`

---

## Short answer

| Question | Answer |
|----------|--------|
| Can I run **ZLM on wall / pin / live** now? | **No.** |
| Is hard refresh enough? | **No.** Refresh only reloads the web page. It does **not** switch live video to ZLM. |
| Do I change camera SIP / 5061? | **No.** Keep **5060**. One number on the device. |
| What do I use for live **today**? | Same as now — **Fleet / FFmpeg** path (ops restore). |

**Not sure → treat as No.** Do not soak wall expecting ZLM until agent shows the real proof line and you see picture.

---

## Why “not yet” (plain)

1. Bad ZLM-first APPLYs hurt live — **reverted**. Wall/pin do **not** wait on ZLM before invite.  
2. Stack cleanup MOB ran on the **server side** — that is plumbing, **not** “ZLM is your live player now.”  
3. Lab still needs **agent** proof: log line `live broker wvp-zlm primary` + you see video. That is **W4**. Not done / not claimed.  
4. You are **not** asked to understand 5061 or register two numbers.

---

## What “running” means **for you** today

| Do | Don’t |
|----|--------|
| Open desk as usual (`:3988`) | Expect ZLM after refresh |
| Open live / wall as usual | Change SIP on cams |
| Say pass/fail from the picture | Read Docker / startPlay / W4 |

If live is black or slow — that is **ops / Fleet** troubleshooting, not “ZLM failed because you didn’t refresh.”

---

## What agent may run (lab only — not your homework)

Agent may start/check WVP/ZLM **containers** and probe stack.  
That is **lab background**. It does **not** mean wall uses ZLM.

When ZLM is ready for **you** to try on wall, agent will say in plain words:

> “Try Open All / one pin. Look for picture. Pass or fail.”

Plus the proof log. Until that sentence — **No ZLM for ops.**

---

## One line

**No ZLM on live from refresh. Keep 5060. Use Fleet as today. Agent proves ZLM later; then you only look at the picture.**
