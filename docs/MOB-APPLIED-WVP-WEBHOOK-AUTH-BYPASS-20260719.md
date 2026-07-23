# MOB-APPLIED — WVP webhook auth bypass (2026-07-19)

**APPLY:** `MOB-APPLY-WVP-WEBHOOK-AUTH-BYPASS`  
**Superseded by:** `MOB-REFACTOR-WVP-ADAPTER-MODULE` (`lib/wvpWebhooks.js` — public-path weaken reverted)

## Problem

Proxy `POST /api/lab/wvp/device-alarm` got **HTTP 401** from `requireDashboardAuth` (not a session). Bridge never reached `raiseDeviceAlarm` / `sos-alarm`.

## Fix

| File | Change |
|------|--------|
| `lib/dashboardAuth.js` | `isPublicPath` allows `/api/lab/wvp/device-alarm` and `/api/lab/wvp/device-ptt-rx` (no cookie/JWT) |

Route handlers still require **loopback** (or `FM_WVP_ALARM_BRIDGE_TOKEN` + header). No bearer/session.

## Verify

After UbitronC2 restart: localhost POST → 200 + fleet `wvp alarm bridge → dashboard` / `sos-alarm pushed`.
