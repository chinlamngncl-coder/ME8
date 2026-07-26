# MOB-APPLIED — Overwatch FOV cone + compass HUD

**Date:** 2026-07-25  
**MOB:** `TACTICAL-OVERWATCH-FOV-COMPASS-V1`  
**Phase:** 2 Task 2.3 enhancement (spatial awareness)  
**Operator:** awaiting PASS  

## What landed

Left map (Leaflet) + right Overwatch live stay as before. When a **saved view** is locked (`Use this view`):

| Surface | Behavior |
|---------|----------|
| Glass pins | UV `%` on `.ar-glass` / `#ax-tactical-ar-glass` (unchanged) |
| Map FOV | `drawCameraFov` — PTZ icon rotated to **azimuth**, semi-transparent cone (`fov_width`) |
| Video compass | Needle `rotate(-azimuth)` so red tip = True North vs camera heading |
| Unlock / pan / close | Pins, FOV, and compass clear together |

**Preset spatial model** (browser `localStorage`, keyed by `cameraId|presetToken`):

- `azimuth` — 0–360  
- `fov_width` — cone degrees (default 60)  
- optional `lat` / `lng` / `range_m` (else fixed-cam GPS)

Toolbar **Heading °** / **FOV °** edit and re-draw while locked.

## Sync path

```
Use this view → TacticalAr.activePreset
  → TacticalOverwatch.onPresetLocked(preset)
      → spatial store + toolbar
      → drawCameraFov(cfg)
      → updateCompass(azimuth)
PTZ pan / Close Overwatch
  → onPresetCleared / onOverwatchClosed
      → clearFov + hideCompass + pins off
```

## Files

- `public/js/tactical-overwatch.js` (new)
- `public/js/tactical-ar.js` (lock/clear/close hooks)
- `public/index.html` (compass HUD, heading/FOV, script)
- `public/css/global.css`
- `public/locales/en.json`
- `scripts/verify-tactical-overwatch-fov-compass-v1.js`

**Cache:** `?v=20260725-tactical-overwatch-fov-compass-v1`  
**Verify:** `npm run verify:tactical-overwatch-fov` (also keep `npm run verify:tactical-ptz-ar`)

## Smoke (plain)

1. **Ctrl+F5**  
2. Tactical → **Overwatch (AR)** → split still works  
3. Pick camera + saved view → **Use this view**  
4. Set **Heading °** / **FOV °** → map shows cone from camera GPS; compass appears on video  
5. Pan with PTZ pad → markers + cone + compass hide  

**Need:** fixed cam must have GPS for the cone. Compass still shows from heading alone.

Say **PASS** or **FAIL**.  
**Do not start Phase 3** until this PASS + your go-ahead.
