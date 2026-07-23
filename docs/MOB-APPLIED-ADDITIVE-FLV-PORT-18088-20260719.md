# MOB APPLIED — additive FLV port string (`192.168.1.38:18088`)

**Date:** 2026-07-19  
**Directive:** `MOB-DIRECTIVE-STRICT-ADDITIVE-WVP-ZLM`  
**Operator:** `apply` (FLV port string only)

---

## Death Sentence compliance

| Touched | Not touched |
|---------|-------------|
| `lib/wvpLabClient.js` `rewriteStreamHost` only (WVP URL string) | Classic Fleet / YDT / SIP / pool / `video-wall.js` / pin |

---

## Change

After host rewrite, FLV/WS URLs **always** set ZLM HTTP port from `FM_WVP_ZLM_HTTP_PORT` (default **`18088`**).  
Broker `uiFlvHost` from `new URL(flvUrl).host` → `192.168.1.38:18088`.

`.env` already has `FM_WVP_ZLM_HTTP_PORT=18088` (unchanged this APPLY).

---

## Next (you)

1. `RESTART-FLEET.bat`  
2. When WVP primary path is on again: open Chin live  
3. Log must show `uiFlvHost` **`192.168.1.38:18088`**  
4. Network: `http://192.168.1.38:18088/...`  
5. Say **`flv-port-ok`** or **`still-wrong-host`**

Step 2 (mpegts overlay additive) waits for your next APPLY — not done now.
