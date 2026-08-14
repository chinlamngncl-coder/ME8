# MOB DISC — Reconnect: 100 / 500 / 1000 BWC plan (you already locked this)

**Date:** 2026-08-11  
**Status:** DISC — **not** a new invention. Re-ties tonight’s ANPR/presence fight to **your** capacity plan.  
**Operator:** Not accepting 2‑BWC software. Already instructed split users / super admin / limited cams online. Already had the calculation / disc.

**Canonical capacity disc (LOCKED 2026-07-13):**  
`docs/MOB-DISC-CAPACITY-MULTI-NODE-LIVE.md`

---

## Human answer (not sleeping — reconnecting)

I am **not** redesigning you down to 2 BWCs. That was a bad way of talking about a **poller-on-SIP** bug.

Your sell model was already written:

| Meter | Meaning | Scale you care about |
|-------|---------|----------------------|
| **A — Registered** | Cameras in the system / license | **~100 → 500 → 1000+** devices |
| **B — Users** | Named operators; **super admins** small (~5) | Hundreds of logins possible |
| **C — Concurrent distinct live** | Cams actually decoding / INVITE / pool | **Tens per node** (lab **8** today) — **shared**, not users×8 exclusive |

**Splitting users / groups / super admin** = who **sees** which cams.  
**Live budget** = how many **different** cams are **open live** at once.  
Those are **two different controls**. You already said that. Big fleets register many cams; only a **limited set** are live because desks are scoped and the site budget is shared.

```
1000 registered  ≠  1000 simultaneous live decode
1000 registered  ≠  1000 simultaneous ANPR/FR/Weapon on one PC
```

Vendors sell the same way: **register many · stream what you open · fan-out viewers · shard sites.**

---

## What went wrong tonight (honest)

| Thing | Status |
|-------|--------|
| Your **100/500/1000 + user split + live budget** plan | **Already in the repo** — I should have led with that, not “2 BWC” language |
| ANPR/FR/Weapon **sidecars** | Separate processes — OK |
| Live **pollers on Fleet main Node** | Breaks the capacity story when analytics run hot — presence flaps while plates still work |
| Lab with few cams open | Hides the cheat — looks like “software only works small” |

So the bottleneck is **not** “we can only sell 2 cams.”  
It is: **analytics ingest must obey the same concurrency rules as live video** (budget + isolate off SIP), or a 1000‑register site still melts one box when someone opens Live ANPR/FR/Weapon hard.

---

## Sell method (locked — matches your instruction)

1. **Register** 100 / 500 / 1000 under license (`maxBwcDevices`).  
2. **Users** split by dispatch groups; super admin = break-glass, not “everyone opens everything.”  
3. **Concurrent live** = site/node budget (8 now → raise only with named soak MOB).  
4. **Analytics** = only on **watched / budgeted** cams (same spirit as live tiles) — not silent full-fleet OCR on main Node.  
5. **City scale** = multi-node + federation (P3 in capacity disc) — not one Node × 1000 exclusive lives.

---

## Work still owed (aligned to YOUR disc — not a new fantasy)

| Track | Next | Why |
|-------|------|-----|
| **Software** | `ANPR-POLLER-ISOLATE-WORKER-V1` → FR → Weapon → shared grab budget | Stop analytics from killing presence on the control plane |
| **Capacity** | Keep `MOB-DISC-CAPACITY-MULTI-NODE-LIVE.md` as sell SOP; paste Google calc into ship sheet when you want | Server SKUs for 100 / 500 / 1000 **register** + concurrent live + analytics seats |
| **Smoke** | Concurrent modules smoke on **budgeted** cams — not “2 cams = done”, not “1000 live decode on one PC” | Honest PASS |

Optional paper when you paste numbers:  
`MOB-DISC-SERVER-CAPACITY-SHIP-FROM-OPERATOR-CALC-V1`

---

## Bottom line

- **Registered cams:** 100 → 500 → 1000 — **yes, that is the product.**  
- **Online / live / analytics at once:** limited by **budget + groups + nodes** — **you already ordered that.**  
- Tonight’s flap = pollers cheating that model — **fix isolate**, don’t shrink the fleet story.

**Next APPLY (software):** `MOB-APPLY ANPR-POLLER-ISOLATE-WORKER-V1`  
**Capacity bible:** `MOB-DISC-CAPACITY-MULTI-NODE-LIVE.md` — still the plan.
