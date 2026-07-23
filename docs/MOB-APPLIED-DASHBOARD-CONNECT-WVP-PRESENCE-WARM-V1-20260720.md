# MOB-APPLIED — DASHBOARD-CONNECT-WVP-PRESENCE-WARM-V1

**Date:** 2026-07-20  
**User:** MOB-APPLY dashboard connect warm; offline must not fake online.

---

## Problem

With `FM_WVP_FLEET_PRESENCE=0`, BWCs register on WVP `:5060` but fleet registry stays offline until SIP keepalives / manual refresh. Dashboard connect only replays **already-online** cams (`replayOnlineDeviceStateToSocket`). First paint: empty map / slow location.

---

## Fix

**New:** `lib/dashboardConnectWarm.js`  
**Wired:** `server.js` `io.on('connection')` after initial replay.

On each dashboard socket connect (coalesced, min interval `FM_DASHBOARD_CONNECT_WARM_MS` default 3s):

1. One-shot `wvpLabClient.listDevices(1, 100)` (works when `FM_WVP_VIDEO_HANDOFF=1` or `FM_LAB_WVP=1`).
2. For each device: **only if** `d.online === true` **and** `isBwcCameraId(id)` → `fleetRegistry.markOnline` + touch.
3. **Never** mark offline devices online.
4. **Never** mark online devices offline (unchanged — SIP stale / activity sweep).
5. Newly online: `ensureBwcEntryForDevice`, `siteDb.touchRuntime`, log `device online from dashboard warm`.
6. GPS + status burst (staggered) for all WVP-confirmed online ids.
7. `emitFleetRoster({ force: true })` if registry changed; replay heartbeats/GPS to connecting socket.

---

## Env

| Var | Default | Meaning |
|-----|---------|---------|
| `FM_DASHBOARD_CONNECT_WARM` | `1` | `0` / off disables |
| `FM_DASHBOARD_CONNECT_WARM_MS` | `3000` | Min ms between WVP list calls (concurrent tabs coalesce) |

Independent of `FM_WVP_FLEET_PRESENCE` — warm is connect-triggered, not background poll.

---

## Operator test

1. Restart ME8 (presence poll can stay off).
2. BWCs on WVP, dashboard closed 30s+.
3. Open dashboard once (hard refresh).
4. **Pass:** fleet list / map online within ~2–5s without manual refresh; only cams WVP shows online.
5. **Pass:** powered-off BWC stays offline (no fake green).
6. Log: `dashboard connect warm` with `wvpOnline` count + `device online from dashboard warm` per new cam.

---

## Files

- `lib/dashboardConnectWarm.js` (new)
- `server.js` (require + `scheduleOnConnect` in connection handler)
