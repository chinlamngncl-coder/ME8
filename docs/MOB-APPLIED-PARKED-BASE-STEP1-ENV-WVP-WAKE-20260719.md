# MOB APPLIED — parked-base Step 1 · env WVP wake

**Date:** 2026-07-19  
**Directive:** `MOB-DIRECTIVE-PARKED-BASE-ADDITIVE-WVP-ONLY`  
**Operator:** `apply` (Step 1 env only)

## Changed

`.env` only:

| Flag | Value |
|------|--------|
| `FM_LAB_WVP` | **`1`** |
| `FM_SOFTOPEN_WVP_ONLY` | `0` |
| `FM_WVP_FLEET_PRESENCE` | `0` |
| `WVP_SIP_PROXY_LISTEN` | `5060` |
| `WVP_SIP_PROXY_TARGET` | `127.0.0.1:15061` |
| `FM_WVP_ZLM_HTTP_PORT` | `18088` |

## Not touched

Classic Fleet / YDT / SIP / wall / pin code. Presence logic files. No freestyle.

## You do

1. `RESTART-FLEET.bat`  
2. Confirm SIP proxy still on `:5060` (or run `START-WVP-LAB.bat` if cam still “Not Connected”)  
3. BWC for WVP: IP `192.168.1.38` · port **`5060`** · platform `44010200492000000001` · domain `4401020049` · pwd `admin123`  
4. Say **`cam-connected`** or **`still-not-connected`**
