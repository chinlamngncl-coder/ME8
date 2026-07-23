# MOB-DISC — Yes: restore a few days ago took WVP out

**Date:** 2026-07-20  
**Status:** DISC only — **no restore, no code**  
**Ask:** “We restored a few days ago and took WVP out — check.”

---

## Verdict

**Yes. That happened. Paper + snapshot + git agree.**

Around **2026-07-18** (classic Fleet soak / classic-PASS floor):

| Item | At that restore / PASS |
|------|-------------------------|
| Lab WVP live | **Off** — `FM_LAB_WVP=0` |
| Soft Open-only | **Off** — `FM_SOFTOPEN_WVP_ONLY=0` |
| WVP presence paint | **Off** — `FM_WVP_FLEET_PRESENCE=0` |
| Chin SIP for classic live | Fleet **`:5062`** (not WVP `:5060` for Ops picture) |
| Operator result | **Classic PASS** (locked in disc) |

Sources:

- `docs/MOB-DISC-CLASSIC-FLEET-PASS-20260718.md`
- Snapshot `.env` in `baseline/2026-07-18-classic-pass/` (`FM_LAB_WVP=0` …)
- Git genre: `81c8929` / classic-PASS baseline wrappers same weekend
- Intent disc: backup classic **before** clean WVP return (`MOB-DISC-BACKUP-CLASSIC-PASS-BEFORE-WVP-20260718.md`)

So: **WVP was deliberately taken out of the live product path** for that classic PASS — not forgotten.

---

## What “took WVP out” meant (precise)

**Not:** delete Docker / never run WVP containers.  
**Yes:** dashboard / Fleet **flags and cam SIP home** set so Ops used **classic Fleet**, not Soft Open / lab WVP picture.

Infra could still sit on LAN later (`MOB-DISC-WVP-ZLM-INFRA-UP-CLASSIC-FLOOR-20260718.md`) while **classic live flags stayed OFF**.

---

## What changed after that (why today feels different)

| When | What |
|------|------|
| **~Jul 18** | Classic PASS — WVP **out** of live path |
| **~Jul 19+** | WVP brought **back** for video/SOS (proxy `:5060`, `FM_LAB_WVP=1`, thin cams, event bus, …) |
| **Now (Jul 20)** | Live `.env` has **`FM_LAB_WVP=1`** again (comment: parked-base / Step1 **2026-07-19**) |

So the Jul 18 “WVP out” restore is **real history**. It is **not** the current running flags.

---

## Link to Phase 1 “which date?” (fact only)

| Question | Answer |
|----------|--------|
| Did we already have a post-restore “WVP out” UI/ops floor? | **Yes — ~Jul 18 classic PASS / classic-PASS snapshot** |
| Is that the same as “Friday Jul 17”? | **Close weekend** — Fri **17** = safety keeps; **Sat 18** = classic PASS + WVP-out flags locked |
| Best label for “UI after WVP-out restore, before Jul 19 WVP return mess” | **`2026-07-18` classic PASS** (`81c8929` / classic-pass baseline), not a new invented date |

This disc **does not** order Phase 1 rollback or “go back.” It only confirms the restore you remember.

---

## Not doing now

- No `RUN RESTORE-…`  
- No flipping `FM_LAB_WVP`  
- No frontend freeze APPLY  

Say a named APPLY if you want Phase 1 freeze aimed at **that Jul 18 WVP-out floor** (or something else).
