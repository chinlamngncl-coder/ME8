# MOB APPLIED — WSS-HTTPS-UPGRADE-LAN-V1

**Date:** 2026-08-22  
**Phrase:** `MOB-APPLY WSS-HTTPS-UPGRADE-LAN-V1`

## Root cause

`dashboardMediaWs.bindUpgrade(httpsServer)` ran at **module load**, when `httpsServer` was still **`null`**.  
HTTPS is only created later in `ensureAndAttachHttps()`. So `:4438` never got `/ws/video` or `/ws/audio` upgrades → console `wss://…/ws/audio` failed. HTTP `:3988` worked (bound on `server`).

## Fix

| File | Change |
|------|--------|
| `server.js` | Bind media WS on `httpsServer` **after** create + `io.attach` (was never bound: `httpsServer` null at load) |
| `lib/dashboardMediaWsBind.js` | **Exclusive upgrade router:** claim `/ws/video` + `/ws/audio`; forward only other upgrades to prior listeners (Socket.IO). Stops Engine.IO `abortUpgrade` closing media WSS. |

## Operator verify

1. Restart Fleet (required).  
2. `https://192.168.1.38:4438` → live → **unmute**.  
3. F12: `wss://…/ws/audio` must **not** say closed/failed.  
4. **PASS** = hear BWC on HTTPS IP.

## Follow-up (same MOB, after FAIL)

First bind-only fix was insufficient: Engine.IO still aborted `/ws/*`. Router wrap is the real fix.
