# MOB APPLIED — mob-softopen-ui-flv-port-fix-v1

**Date:** 2026-07-18  
**APPLY:** `MOB-APPLY mob-softopen-ui-flv-port-fix-v1`  
**Source:** Google / operator surgical order  
**Scope:** FLV URL port only — **no SIP / no BWC rekey**

---

## Bug

`lib/wvpLabClient.js` `rewriteStreamHost` cleared port `80` → URL became `http://192.168.1.38/...` (default 80).  
Broker logged `uiFlvHost: 192.168.1.38` without `:18088` even when `wvp-zlm primary` succeeded.

## Fix

Force lab ZLM HTTP port **`18088`** (env `FM_WVP_ZLM_HTTP_PORT`) when rewriting play FLV/WS URLs for the browser.

| File | Change |
|------|--------|
| `lib/wvpLabClient.js` | `rewriteStreamHost` → set port `18088` |
| `.env` | `FM_WVP_ZLM_HTTP_PORT=18088` |

---

## You do

1. **`RESTART-FLEET.bat`** (reload Node + env)  
2. `http://localhost:3988` → open Chin live (same path as now)  
3. Network tab: request to **`http://192.168.1.38:18088/...`** (not bare `:80`)  
4. Log: `uiFlvHost` like **`192.168.1.38:18088`**  
5. Say **`flv-port-ok`** or **`still-black`**

**One line:** FLV rewrite now forces `:18088`; restart → Chin live → prove Network hits 18088.
