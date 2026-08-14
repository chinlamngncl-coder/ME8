# MOB DISC — Not a 2‑BWC product: bottleneck, capacity, sell method

**Date:** 2026-08-11  
**Status:** DISC — human truth before pack/ship  
**Operator position (locked):** Will **not** accept a 2‑BWC toy. Selling means **right method + right capacity**. Lab “it worked on two cams” is **not** ship proof.

---

## Speak plain

We hit a **real bottleneck**. Not because you dreamed too big. Because live FR / ANPR / Weapon **pollers were put on the same Node process as SIP and presence**. Sidecars (Python) are fine. The **ingest pollers** are the squeeze.

So:

- Plates / faces / weapons can still “work.”  
- Whole Fleet can still **flap Online/Offline.**  
- That shows up when load looks like a **customer**, not a quiet 2‑cam desk.

You already did capacity math (with Google). Good. That work still matters. This bottleneck does **not** cancel it — it means **software placement + server sizing must match** or the math is paper only.

---

## What we sell (contract)

| Accept | Reject |
|--------|--------|
| Many BWCs Online together | “Works on 2 BWC” as done |
| Wall + map + VC + FR + ANPR + Weapon concurrent | Turning modules off to keep presence pretty |
| Aggressive ANPR grab kept | Slowing analytics forever so SIP looks fine |
| Documented **server requirements** for that load | Shipping without capacity truth |

---

## Two parts of the sell method (both required)

### A) Software method (stop cheating the process)

Move analytics **live pollers** off SIP-critical main Node:

1. `ANPR-POLLER-ISOLATE-WORKER-V1`  
2. `FR-POLLER-ISOLATE-WORKER-V1`  
3. `WEAPON-POLLER-ISOLATE-WORKER-V1`  
4. `ANALYTICS-SHARED-GRAB-BUDGET-V1` (many cams, one grab pool, drop-oldest)  
5. `CONCURRENT-MODULES-SMOKE-PACK-V1` (full concurrent smoke — not 2 cams)

Detail: `MOB-DISC-CONCURRENT-MODULES-SHIP-NOT-2BWC-LAB-20260811.md`

### B) Capacity method (your calculation — lock into ship desk)

Before customer pack, we must write and stand behind:

- **Min / recommended** CPU, RAM, disk, GPU (if any)  
- How many **concurrent live cams** per analytic  
- How many **analytics on at once** (FR+ANPR+Weapon)  
- Network / ZLM / WVP assumptions  
- What **fails first** under overload (drop frames — never fake Online)

**Next paper when you say so:**  
`MOB-DISC-SERVER-CAPACITY-SHIP-FROM-OPERATOR-CALC-V1`  
You bring (or paste) the Google calculation → we turn it into a **ship desk capacity sheet** that matches the concurrent-modules architecture. No inventing fake numbers.

---

## Why this feels like a late cheat

Because feature work ran ahead of **isolation + capacity lock**. That is on the build path, not on you “asking for too much.” Fixing it is **more work before ship** — correct. Skipping it and selling 2‑BWC behaviour is the real cheat.

---

## What we do next (one line)

**Software next:** `MOB-APPLY ANPR-POLLER-ISOLATE-WORKER-V1`  
**Capacity next (paper):** when you paste your calculation → `MOB-DISC-SERVER-CAPACITY-SHIP-FROM-OPERATOR-CALC-V1` → then pack gate must cite that sheet.

No park. No “2 cams is enough.” No less-grab ending.
