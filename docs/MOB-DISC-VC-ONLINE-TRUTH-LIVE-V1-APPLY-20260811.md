# MOB-APPLY VC-ONLINE-TRUTH-LIVE-V1 — APPLY lock

**Date:** 2026-08-11  
**Status:** APPLIED — restart dashboard + hard refresh VC

## Fixes

1. **`onlineDeviceIdsForGroups`** — only `fleet.online === true` (was all fleet ids = fake Online).  
2. **Who can join operators** — removed hard-coded green Online.  
3. **Live refresh** — while VC Live is open: 5s lobby poll + `fleet-roster` / `heartbeat` → BWC dropdown + personnel update **without** F5 (bypasses 60s panel warm).

## Files

- `server.js`  
- `public/js/conference-hub.js`  
- `public/js/vc-lazy.js` (`?v=20260811-vc-online-truth-live-v1`)

## Operator check

1. Restart server; hard refresh.  
2. VC → offline BWC must **not** say Online / not in Add dropdown.  
3. Bring BWC online → appears in dropdown within ~5s without refresh.  
4. Who can join: no fake green Online on all users.
