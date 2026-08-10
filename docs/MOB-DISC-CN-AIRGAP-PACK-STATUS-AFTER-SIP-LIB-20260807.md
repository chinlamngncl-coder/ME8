# MOB DISC — CN AirGap pack status after `cn-pack-sip-lib-and-smoke`

**Date:** 2026-08-07  
**Status:** P0 SIP-lib gap **fixed in zip**; **not** “zero problems forever”  
**Ship zip:** `Mobility_Axiom_AirGapped_CN-20260807-1024.zip` (~1541 MB)  
- Desktop: `C:\Users\user\Desktop\Mobility_Axiom_AirGapped_CN-20260807-1024.zip`  
- Dist: `ME8\dist\Mobility_Axiom_AirGapped_CN-20260807-1024.zip`  
**Ignore:** `…-20260806-2307.zip` and `…-20260807-0928.zip` (incomplete)

---

## Done? (this APPLY)

| Item | Status |
|------|--------|
| Pack `protected/lib` SIP require graph (5 files) | DONE |
| Require-resolve smoke (libs + `../lib/wvpSipLanMap` from scripts/) | DONE on stage before zip |
| Zip contains libs + migrations + proxy + CN manual | DONE (verified at zip time) |
| Packer script updated for next rebuilds | DONE (`PACK-CN-AIRGAP-V2.ps1`) |

**Edited:** `ME8\scripts\PACK-CN-AIRGAP-V2.ps1` only (packer) — copies SIP libs, self-check paths, require smoke.

---

## No problem anymore? **No — honest residual list**

### Fixed (were customer fatals)
1. Missing `ship-build/db/migrations` → fixed earlier (0928+)  
2. SIP script without `protected/lib/*` → fixed in **1024**

### Still real risks (not re-proven green on a clean listen)
3. **Full one-click boot on free ports** — lab still had another Fleet on `:5062/:6000/:29201/:5060` when last live `run.js` was tried. After SIP-lib fix we proved **module resolve**, not a clean `dashboard listening` + SIP child stay-alive on production ports. Partner virgin PC should be fine; **this lab has not re-smoked end-to-end since 1024.**  
4. **Stale Docker Postgres volume** — reinstall with different `.env` password → `password authentication failed`. First-time PC OK; retry on same machine needs volume reset or matching password.  
5. **License vs pack policy** — license still opens FR/ANPR/weapon/VC; zip still does **not** one-click those engines (see analytics one-click disc). Ops core ≠ “all licensed modules packed.”  
6. **Jiangsu map** — offline tiles present (incl. Nanjing/Jiangsu bbox); not full-province Planetiler.

---

## Partner instruction (1024 only)

1. Full unzip  
2. Docker Desktop up  
3. No other Mobility holding SIP/PTT/msg ports  
4. `Axiom_Enterprise_Setup.bat` → real LAN IP (not 172.17–31)  
5. `http://LAN:3888` → `global` / `global123`

---

## Optional next APPLY (only if user wants)

`MOB-APPLY cn-pack-boot-smoke-clean` — stop lab Fleet or use free ports, compose + `run.js`, assert: no SIP `MODULE_NOT_FOUND`, migrations 1–9, `GET /login.html` 200, then stamp PASS in this disc.

Until that runs: say **“P0 pack holes closed; full listen smoke still owed on a quiet machine.”**

---

**Ubitron · Mobility Axiom** — status disc after SIP-lib APPLY  
