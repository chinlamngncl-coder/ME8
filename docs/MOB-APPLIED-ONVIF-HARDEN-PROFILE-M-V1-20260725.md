# MOB-APPLIED — Enterprise ONVIF hardening & Profile M prep

**Date:** 2026-07-25  
**MOB:** `ONVIF-HARDEN-PROFILE-M-V1`  
**Phase:** 2 Task 2.5  
**Operator:** **PARKED** 2026-07-25 — no cameras in lab to smoke; code stays landed. Resume when hardware available.  

Access Control Profiles C/A/D are **out of scope** (Video/Tactical focus).

## 1) Time sync (anti-replay)

On every ONVIF connect (`connectCam` / probe / stream resolve):

1. `GetSystemDateAndTime`  
2. If |camera − server| > `FM_ONVIF_CLOCK_DRIFT_MS` (default **2000** ms)  
3. `SetSystemDateAndTime` (Manual, UTC = Node server time)

Non-fatal if camera denies write — session continues; `clock` returned on capabilities probe.

## 2) `stream_transport` (tcp|udp)

- Migration: `db/migrations/004_fixed_cameras_stream_transport.sql`  
- Registry / Add camera payload: top-level **`streamTransport`** (default `tcp`)  
- Mirrors into `onvif.rtspTransport` for ZLM / ffmpeg  
- UI: **Stream transport (RTSP)** shown for ONVIF and RTSP sources (TCP recommended over VPN)  
- CSV: `StreamTransport` column  

## 3) Pull-Point events

| Route | Role |
|-------|------|
| `POST /api/fixed-cams/:id/onvif/events/start` | CreatePullPoint + PullMessages loop |
| `POST /api/fixed-cams/:id/onvif/events/stop` | Unsubscribe |
| `GET /api/fixed-cams/onvif/events` | List active subs |

Parsed kinds (console for now): `motion`, `line_crossing`, `tamper`, `analytics`, `other`.

## 4) Profile M

`detectProfiles` → `profileM` / `hasAnalytics` when GetCapabilities shows Analytics / AnalyticsDevice / Metadata (groundwork for AI metadata later).  
Also returns `profileS` / `T` / `G` / `hasEvents`.

## Files

- `lib/fixedCamOnvif.js`  
- `lib/fixedCamRegistry.js`, `lib/fixedCamCatalogPg.js`, `lib/siteDb.js`  
- `db/migrations/004_fixed_cameras_stream_transport.sql`  
- `server.js`  
- `public/js/fixed-cams-ui.js`, `public/index.html`  

**Verify:** `npm run verify:onvif-harden`  
**Cache:** `fixed-cams-ui.js?v=20260725-onvif-harden-profile-m-v1`  

## Smoke (plain)

1. **Restart** Fleet (migration 004)  
2. Fixed Cameras → Add/Edit → see **Stream transport** = TCP by default  
3. With an ONVIF cam later: capabilities shows `clock` + `profiles.profileM`  
4. Optional: `events/start` → motion on camera → server console `[onvif-event]`  

Say **PASS** or **FAIL**. **Do not start Phase 3** until you open it.
