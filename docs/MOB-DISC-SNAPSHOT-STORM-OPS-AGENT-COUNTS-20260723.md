# MOB DISC — Snapshot “storm” (you click once — agent counts the log)

**Status:** DISC locked — **no Snapshot code MOB** until a TakePicture count exists  
**Date:** 2026-07-23  
**Trigger:** Operator — “I only click once. I am not a fool. What the fuck are you talking about?”

---

## Apology / clarity

You are right: **you click Snapshot once.**  
Nobody asked you to click five times.

“Storm” does **not** mean “operator clicked many times.”  
It means: **one click might still cause the server/device to fire many TakePicture commands**, or the UI/device **feels** like many shutter events. We need the **log** to see which.

**You do not read logs. The agent does.**

---

## What you do (human — 30 seconds)

1. Prefer a **fresh Fleet restart** so the log slice is clean (optional but cleaner).  
2. On Operations, select the BWC.  
3. Click **Snapshot** **exactly once**. Wait a few seconds.  
4. Tell the agent one line:

```
SNAPSHOT OPS: I clicked Snapshot once on <camId or name>. Count TakePicture now.
```

That is the whole job.

---

## What the agent does (not you)

1. Opens `storage/fleet.log` (or service log).  
2. Around the time of your click, counts lines with **`TakePicture`** (and related `remote-control` / device-control).  
3. Reports the number to you.

| Log count | Truth | Next |
|-----------|--------|------|
| **1×** `TakePicture` | Dashboard sent **one** command. Extra “clicks” feel = **BWC shutter / status noise / UI**, not multi-bind | Named MOB only if we know which surface (device vs UI) — **not** a blind “stop double click” hack |
| **N×** `TakePicture` (N≥2) for one click | Dashboard or server **multi-emit** | Then named fix, e.g. `SNAPSHOT-SINGLE-EMIT-V1` (name locked after count) |

---

## Why we said “count” before (badly)

Old disc said “one click + count TakePicture” — sounded like **you** should count.  
**Wrong.** You click once. **Agent counts.**

---

## Do NOT

- Ask the operator to open fleet.log or learn grep  
- Invent a Snapshot MOB from “feels like 5–6 clicks” alone  
- Blame the operator for multi-shutter  

---

## WHEN to run this gate

| Do Snapshot ops now if… | Wait if… |
|-------------------------|----------|
| Snapshot still feels wrong and you want it fixed next | Mid another APPLY test |
| You can click once on a live BWC | No camera online |

**Not blocked by** FR. **Not blocked by** lock/unlock GPS MOB (different bug).

Order tip: finish **Lock→Unlock pin** APPLY if that hurts more; Snapshot gate can wait. Or do Snapshot gate first if Snapshot hurts more — your call by pain, not by agent nag.

---

## After the count

Agent replies with: `TakePicture count = N` and the **one** next APPLY name (or “no dashboard multi-emit — park / device side”).

Until you send **SNAPSHOT OPS: … Count TakePicture now.** → no Snapshot code.
