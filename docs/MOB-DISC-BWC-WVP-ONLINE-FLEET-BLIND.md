# MOB DISC — BWC online in WVP but Fleet software does not see it

**Date:** 2026-07-17  
**Status:** APPLIED — `mob-fleet-presence-from-wvp-v1` → `MOB-APPLIED-FLEET-PRESENCE-FROM-WVP-V1.md`  

---

## Lab fact (before APPLY)

| Place | Result |
|-------|--------|
| WVP | Chin + kk **online** |
| Fleet dashboard “online” | Blind — no Fleet SIP register |

## After APPLY

Fleet polls WVP online → Axiom map/fleet list. **Ports unchanged** (5060 WVP / 5062 Fleet).

## One line

**WVP marriage on cam; Axiom presence from WVP poll — not a second BWC port.**
