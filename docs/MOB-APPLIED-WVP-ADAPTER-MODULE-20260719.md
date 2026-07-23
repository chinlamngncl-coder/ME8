# MOB-APPLIED — WVP adapter module (2026-07-19)

**APPLY:** `MOB-REFACTOR-WVP-ADAPTER-MODULE`

## Goal

Stop patching global dashboard auth for WVP. Contain inbound WVP webhooks in one adapter.

## Changes

| File | Change |
|------|--------|
| `lib/wvpWebhooks.js` | **New** Express router: `POST /device-alarm`, `POST /device-ptt-rx`; IP whitelist (+ optional bridge token); translates → `raiseDeviceAlarm` / `emitPttRxState` → Socket.IO |
| `server.js` | `app.use('/api/lab/wvp', wvpWebhooks.createRouter(...))` **before** `requireDashboardAuth`; removed inline bridge IIFE |
| `lib/dashboardAuth.js` | Reverted public-path bypass for those webhooks (core JWT/session auth unchanged) |
| `lib/wvpGb28181Bridge.js` | Comment: inbound path points at adapter |

## Security

- No session/JWT on webhook POSTs (mounted before dashboard auth).
- Trust: loopback + `FM_WVP_WEBHOOK_TRUSTED_IPS` (+ optional `FM_WVP_ALARM_BRIDGE_TOKEN` header).
- Other `/api/lab/wvp/*` (status/play/…) still require dashboard auth.

## Supersedes

`MOB-APPLY-WVP-WEBHOOK-AUTH-BYPASS` public-path weaken — removed.
