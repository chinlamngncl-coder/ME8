# MOB APPLIED — classic-fleet-live-env-chin-5062

**Date:** 2026-07-17  
**APPLY:** `MOB-APPLY classic-fleet-live-env-chin-5062`  
**Scope:** `.env` only — **no** Soft Open UI / wall / player / broker code patches

## Flags

| Flag | Value | Why |
|------|-------|-----|
| `FM_LAB_WVP` | `0` | Stop live broker preferring WVP/ZLM (`relay_inactive` black panel) |
| `FM_SOFTOPEN_WVP_ONLY` | `0` | Soft Open-only stays off |
| `FM_WVP_FLEET_PRESENCE` | `0` | Online from Fleet REGISTER (Chin on :5062), not WVP paint |

## Operator

1. **Restart** Fleet (service / `RESTART-FLEET.bat`)  
2. Hard refresh — prefer `http://192.168.1.38:3988`  
3. **TEST Chin only** (kk may look offline — OK):  
   - Online?  
   - Live **panel**?  
   - Live **pin**?  
   - Software **PTT** hold?  
   - Cold SOS still?  

Reply: each **PASS** / **FAIL** (or one line summary).

## Not done

- No Soft Open UI patch  
- No kk rekey  
- No Gold restore  
