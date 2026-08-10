# MOB DISC — Port 8769 busy / START-WEAPON fails (Errno 10048) (2026-08-07)

**Status:** disc only. No code until APPLY.  
**Operator:** Sick of ports / 127 / env. START-WEAPON shows bind error 10048. What now? Speak human.

---

## What happened (plain)

**Nothing new broke in `.env`.**  
Port **8769** is already taken by a Weapon engine that is **already running**.

Windows error:

```text
[Errno 10048] … bind on address ('127.0.0.1', 8769): only one usage …
```

Means: second Start tried to open the same door; first process still holds it.

That first process is almost certainly the sidecar we started (minimized) during **WEAPON-B-COLAB-WIRE** — or an older Start window you forgot.  
**One** Weapon sidecar on 8769 is correct. **Two** Starts = this error.

---

## Are you broken?

**Usually no.** If the first one is healthy:

- Browser Weapon can still work (Engine OK / `colab_b`).  
- You do **not** need to Start again.  
- Close the failed bat window; leave the **working** one alone (or just use the already-running process).

Check: open Weapon page — if engine is OK, **ignore the failed Start**.

---

## What you should do (normal use — no tech soup)

1. **Only one** `START-WEAPON.bat` at a time.  
2. If Start fails with 10048:  
   - Look for another “Start Weapon” / python window → close it, **or**  
   - If Weapon page already says Engine OK → you are fine; do nothing.  
3. Do **not** chase 127 / env for this error — it is “already started.”

---

## Why this feels cursed

Lab had:

- Agent auto-start on 8769 (wire MOB)  
- You click Start again  
- Collision  

Customers with one Start and no agent should not hit this every day.  
We still owe a calmer Start later (detect “already up” → print OK and exit, no ERROR spam) — **only after you APPLY that**.

---

## Optional next APPLY (when you want)

`MOB-APPLY WEAPON-START-IF-ALREADY-UP-OK-V1`

Bat checks `http://127.0.0.1:8769/health` first:

- Already OK → print “Weapon already running” and exit 0 (no bind fight).  
- Down → start as now.

Until then: **one Start only**; 10048 = already running.

---

## Standing

10048 ≠ Postgres ≠ wrong Colab file.  
= **Port already in use by Weapon.** Use the one that is up, or close it then Start once.
