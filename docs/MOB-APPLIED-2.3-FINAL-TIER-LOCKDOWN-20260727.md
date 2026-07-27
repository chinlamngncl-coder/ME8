# MOB-APPLIED 2.3-FINAL-TIER-LOCKDOWN (2026-07-27)

## Changes
1. `public/setup-boot.html` — WAN option in select; `loadTier` shows WAN label; save button disabled during POST (anti-spam).
2. `lib/setupOnlyServer.js` — `GET /api/setup/status` returns `networkTier`; `POST /api/setup/network-tier` accepts `wan`.

## Operator PASS
Restart Setup → refresh page → Current tier reflects saved value → Save WAN succeeds → button briefly locks then unlocks.
