# MOB DISC — WVP-first is the decision · no Fleet rollback · no restore · now what (NO APPLY)

**Status:** DISC only — 2026-07-19 · **no code**  
**Subject:** `MOB-DISC-WVP-FIRST-NOW-WHAT`  
**Operator order (locked):**

- We are **not** going back to Fleet as the live/SOS/PTT home.  
- We are **not** doing RESTORE. **Do not suggest restore.**  
- We already reverted classic, then put **WVP on top** because the agent said it would work.  
- Do **not** answer with “it doesn’t work.” Answer with **what the WVP pack still owes** and **what we do next.**

---

## Accountability (plain)

You were told: revert / park classic pain, put WVP-ZLM on top, live would carry the desk.

**What actually shipped:** WVP-ZLM for **picture**.  
**What did not ship:** a full **WVP-era contract** for **Call / PTT / cold SOS / SOS** that no longer depends on Fleet SIP marriage.

So the agent promise was **over-sold**. Picture PASS. Voice/SOS pack **never finished**. That is on the agent path — not on you “failing to restore Fleet.”

**Locked from this disc forward:**

| Forbidden | Why |
|-----------|-----|
| Suggest `RUN RESTORE-…` / classic-pass restore | You banned it |
| “Go back to Fleet / rekey all to 5062 for classic” as the fix | You banned Fleet-as-home |
| “Nothing works” with no next WVP step | Useless |

---

## Decision (locked)

**Pack owner = WVP (+ ZLM for picture).**  
Fleet Node may still run for leftovers (PTT TCP port, dashboard, old hooks) but **must not be the story** for “why live is up.”  
Every remaining dead feature must be redesigned as **WVP-first**, not “please marry Fleet again.”

---

## Why live works but the rest feels dead (WVP-first reading)

| Feature | Today | WVP-first truth |
|---------|--------|-----------------|
| Open live | WVP startPlay → ZLM → wall `<video>` | **Done path** (keep) |
| Call | Server still wants Fleet streaming and/or PTT-online | **Still Fleet-era gate** — must be rewritten for WVP watch |
| PTT TX / cold PTT | Fleet PTT channel / wake / online set | **Still Fleet-era** — needs WVP-era PTT policy (keep PTT server, drop “must Fleet INVITE first”) |
| Cold SOS / SOS | Fleet SIP contact + cold pull / invite | **Still Fleet-era** — needs WVP alarm ingest + live-from-WVP, not Fleet REGISTER |

So: not five random bugs. **One unfinished migration:** UI/server still enforce **classic gates** after picture moved to WVP.

---

## Now what (WVP pack roadmap — paper only)

One genre, ordered. **No micro Call MOB until the pack steps are named and you APPLY.**

### Step W1 — Single source of “Ops live”

- “Live” for Call/UI = **WVP/ZLM watch** (or WVP session), not `liveStreamPool.isStreamingForCam`.  
- Finish/stabilize watch register (no remount clear).  
- **No SIP INVITE** required for that flag.

### Step W2 — Call on WVP live

- Call allowed when WVP-live flag is on.  
- Voice path: keep working PTT/intercom that does **not** demand Fleet ffmpeg session.  
- Exact wire = named APPLY when you say W2.

### Step W3 — PTT without Fleet INVITE

- PTT online/wake must work for cams that only exist on **WVP presence + PTT TCP**, not “after Fleet invite.”  
- Cold PTT / missed banner = same brain.

### Step W4 — SOS without Fleet SIP home

- Cold SOS: alarm must reach ME8 from **WVP path or companion/MESSAGE bridge**, then wall pulls **WVP-ZLM live**, not Fleet INVITE cold pull.  
- SOS-while-live: takeover uses WVP live already open.

### Step W5 — Honest dual-cam lab (optional)

- If one cam stays on a weird second port for experiments, **label it** — do not pretend both get full WVP pack until W1–W4 done.

---

## What “success” means (so we stop lying)

**PASS for WVP pack (operator see):**

1. Open live (already).  
2. Call works on that live **without** “start live / not on PTT” Fleet lies.  
3. PTT hold works on wall/pin.  
4. Cold PTT shows.  
5. Cold SOS banners + live from WVP.  

Until 2–5 exist, agents must say: **“WVP picture PASS; WVP voice/SOS pack incomplete — next is Step Wx.”**  
Not: “restore classic.” Not: “Fleet again.”

---

## Immediate next (when you want code)

You name **one** step only, e.g.:

**`MOB-APPLY-WVP-PACK-W1-LIVE-FLAG`**  
or **`MOB-APPLY-WVP-PACK-W2-CALL`**  
…

I implement **only that step**. No restore. No Fleet-home rollback. No panel freestyle in the same MOB.

---

## Status

**DISC only.**  

**You chose WVP. We stay on WVP.**  
Promise was incomplete — picture without voice/SOS pack.  
**Now what = finish WVP pack Steps W1→W4**, not mourn Fleet, not restore.

Waiting for your **Step APPLY name**.
