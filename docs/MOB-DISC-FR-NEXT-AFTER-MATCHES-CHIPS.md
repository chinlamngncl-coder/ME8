# MOB DISC — Status summary · what next

**Status:** DISC only — **no APPLY** until you name a MOB  
**Date:** 2026-07-13  
**Trigger:** “next. summary again. next mob is what Mob disc”

---

## Where we are (short)

| Area | State |
|------|--------|
| Gallery re-embed | **APPLIED** (`mob-fr-gallery-re-enroll-migrate`) — lab entry ONNX 512 |
| Live match | **Still FAIL** earlier — snaps/Recent faces, **no score** / no watchlist hit |
| Matches chips UI | **PASS** — far-right toolbar, snap-slot size, no Analytics h2 — **keep** |
| Grade → alert UX | Half done: poi/monitoring silent; suspect still red-path; amber/chime not applied |
| Overflow / Keep→holds | DISC locked, **not applied** |
| Engine ship default | Still DeepFace in code; lab `.env` onnx — cutover **not** applied |

---

## Recommended next (honest order)

Matching is still the blocker. Empty **Matches** chips until score ≥ threshold.

| # | Next MOB / action | Why |
|---|-------------------|-----|
| **0** | *(no MOB)* Prove a **score** — re-photo enroll / lower threshold briefly / walk-test | Without this, Hits UX is dark |
| **1** | `mob-fr-engine-cutover` | Only after match PASS |
| **2** | `mob-fr-hits-overflow-queue` | `+N` list when >5 Matches |
| **3** | `mob-fr-hit-keep-to-holds` | Keep from Matches chip → Investigation |
| **4** | `mob-fr-amber-toast-suspect` | Suspect ≠ red alert |
| **5** | `mob-fr-chime-by-tier` | Chime blacklist only |
| **6** | `mob-fr-holds-disposition-status` | Clear/Close Investigation holds |

**If you want product UX next and park match:** say **#2** or **#4**.  
**If you want recognition next:** stay on **#0** then **#1**.

---

## Suggested next MOB (one line)

**Default suggestion:** stay on **match proof (#0)** — then `MOB-APPLY mob-fr-engine-cutover` only when a known face scores.

**If UI first:** `MOB-APPLY mob-fr-hits-overflow-queue` or `MOB-APPLY mob-fr-amber-toast-suspect`.

---

## Apply cheatsheet (pick one)

```text
MOB-APPLY mob-fr-hits-overflow-queue
MOB-APPLY mob-fr-hit-keep-to-holds
MOB-APPLY mob-fr-amber-toast-suspect
MOB-APPLY mob-fr-engine-cutover
MOB-APPLY mob-fr-holds-disposition-status
```

---

## Bottom line

Desk Matches UI = **keep**.  
Biggest open hole = **live match still not firing**.  
Next MOB = your call: **match/cutover** vs **overflow / amber / Keep**.
