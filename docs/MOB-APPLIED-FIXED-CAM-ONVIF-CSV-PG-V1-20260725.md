# MOB-APPLIED — Real ONVIF + Fixed Cameras CSV → PostgreSQL

**Date:** 2026-07-25  
**MOB:** `FIXED-CAM-ONVIF-CSV-PG-V1`  
**Phase:** 2 Task 2.4  
**Operator:** awaiting review / PASS  

## Park note (2.3)

Overwatch FOV / Save View smoke **parked** — no PTZ camera in lab right now. Resume when hardware is available.

## ONVIF library (real, not mock)

```js
const { Cam } = require('onvif');
const { Cam: CamPromises } = require('onvif/promises');
```

Package already in `package.json`: `onvif@^0.8.1` (agsh/onvif SOAP client).  
We did **not** switch to a second library (`node-onvif`) — same job, would fork the stack.

Core module: `lib/fixedCamOnvif.js`

| Function | Role |
|----------|------|
| `authenticateAndProbe(camera)` | connect (auth) + **GetCapabilities** → Profile S / T / G flags |
| `setPreset(client, presetName)` | real ONVIF **SetPreset** |
| `gotoPreset(client, presetToken)` | real ONVIF **GotoPreset** |
| `getPresets` / `getPtzSession` | list Views + cached PTZ session |

API:
- `GET /api/fixed-cams/:id/onvif/capabilities` — probe profiles  
- `POST /api/fixed-cams/:id/ptz` actions: `goto-preset`, **`set-preset`**, pan/tilt/zoom  

## Add Camera form payload

`POST /api/fixed-cams` body (from Fixed Cameras UI):

```json
{
  "name": "…",
  "lat": 3.15,
  "lng": 101.71,
  "zone": "KL Central",
  "rtspUrl": "rtsp://…",
  "onvif": {
    "host": "192.168.1.50",
    "port": 80,
    "user": "admin",
    "password": "…",
    "devicePath": "/onvif/device_service",
    "rtspTransport": "tcp"
  },
  "ptzEnabled": true,
  "streamSource": "onvif",
  "mapIcon": "ptz",
  "enabled": true,
  "notes": ""
}
```

Required for officers: **Name**, **GPS (lat/lng)**. ONVIF IP/port/user/password when stream source = ONVIF. **PTZ capable** = `ptzEnabled`.

## CSV template header

```
Name,Lat,Lng,Zone,StreamUrl,OnvifIp,OnvifPort,OnvifUsername,OnvifPassword,PtzCapable
```

Legacy aliases still accepted: `OnvifHost`, `OnvifUser`, `PtzEnabled`, `MapIcon`, `StreamSource`, `Enabled`, `Notes`.

## CSV import → PostgreSQL

- `POST /api/cameras/import-csv` `{ "csv": "…" }` (UI uses this)  
- Alias: `POST /api/fixed-cams/import-csv`  
- Migration: `db/migrations/003_fixed_cameras.sql`  
- Passwords: AES-256-GCM vault envelope in `onvif_password_enc` (never plaintext in PG)  
- Also updates runtime `fixed-cams.json` so live/PTZ keep working  

**Verify:** `npm run verify:fixed-cam-onvif-csv`  
**Restart:** required (server + migration 003 on catalog init)

## Smoke (plain)

1. Restart Fleet console (so migration 003 runs)  
2. Settings → Fixed Cameras → **Download template** — header matches above  
3. Optional: paste 1 CSV row → Import → count increases; password not echoed  
4. With a real ONVIF cam later: **capabilities** / Set View / Goto View  

Say **PASS** or **FAIL**. Wait for your review before Phase 3.
