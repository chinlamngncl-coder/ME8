# MOB DISC — Choose next: VMS A3 vs SOS rescue Phase 1

**Status:** DISC only — pick one genre. Do **not** APPLY both in one turn.  
**Date:** 2026-07-08  
**Context:** Password genre done; SOS ledger scope **PASS**; deploy A1–A2 + Identity rename done.

---

## Side-by-side

| | **VMS A3** `mob-vms-deploy-a3-hierarchy-labels` | **Rescue Phase 1** `mob-sos-nearby-fleet-gps-see-all` |
|--|--|--|
| **Job** | Make Corporate vs Station **obvious** on Users (labels/copy) | NHQ/see-all nearby list uses **full fleet GPS**, not only map pins |
| **Touches** | Users admin UI + i18n | SOS nearby / map helpers / possibly small API |
| **Risk** | **2** — Settings only | **4** — live SOS path; **ME8 checkpoint ritual** required |
| **Locked files?** | No wall/PTT/SIP | Near wall/SOS habits — high caution |
| **Unblocks** | Training / tender “hierarchy” story; pairs with ledger PASS | Better multi-group rescue when pins are lazy |
| **Does not** | Change enforcement (already done) | Open Alpha ledger to Bravo history |
| **Depends on** | Nothing | Need a real bench: see-all + B SOS + A in radius |

---

## What each ships (detail)

### A3 — hierarchy labels (Settings)

- Badge / line: **Corporate (all stations)** vs **Station-scoped**  
- Short hint under group assign: station ops only see assigned groups on map, fleet, SOS ledger  
- No new org-tree DB; no see-all behaviour change  

**Bench:** Settings only — open Users, check badges; no Open All required.

### Phase 1 — nearby full GPS (Ops / live-adjacent)

- See-all (and super admin) compute nearby from **fleet GPS for all cams**  
- Station-scoped sessions unchanged  
- Push team still ACL-checked  

**Bench (checkpoint):** restart → one cam live → stop → Open All lite → stop all; **plus** B SOS with A in radius → A appears for see-all → Push team; Alpha-only still no B ledger.

---

## Recommendation (locked opinion)

**Do VMS A3 first.**

Reasons:

1. Matches current **deploy genre** (A1–A2 done → A3 → A4 → A5). Finish the corporate Settings story before another live-adjacent MOB.  
2. Risk **2** after a password MOB — lower chance of fighting fire on wall/SOS.  
3. Hierarchy **labels** make the ledger PASS + “use NHQ for rescue” SOP **trainable** tomorrow; Phase 1 only helps if you already proved NHQ nearby is **blind** (lazy pins).  
4. Phase 1 is the right **next live genre step** after A3–A5 (or after a deliberate “skip to rescue” with checkpoint), not interleaved with Settings chrome.

**Do Phase 1 first only if** tonight’s NHQ desk already fails the nearby test (A online with GPS, in radius, missing from list). Then Phase 1 is fixing a **real ops hole**; A3 can wait one turn.

---

## Order if both this week

1. `MOB-APPLY mob-vms-deploy-a3-hierarchy-labels`  
2. (Optional) A4 readiness → A5 note  
3. `MOB-APPLY mob-sos-nearby-fleet-gps-see-all` + **CHECKPOINT**  
4. Phase 2 only if station assist-live is required  

---

## Reply to proceed

- Settings path: **`MOB-APPLY mob-vms-deploy-a3-hierarchy-labels`**  
- Rescue path (only if nearby is broken for NHQ): **`MOB-APPLY mob-sos-nearby-fleet-gps-see-all`**  
