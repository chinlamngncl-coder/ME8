# MOB-APPLIED — Overwatch Save View state sync

**Date:** 2026-07-25  
**MOB:** `TACTICAL-OVERWATCH-SAVE-VIEW-SYNC-V1`  
**Phase:** 2 Task 2.3 (Set on Right, Show on Left)  
**Operator:** awaiting PASS  

## Philosophy

- Right Overwatch video = **master** state (Save View panel)  
- Left Leaflet map = **slave** visual (FOV cone rotates live)  
- Operator chrome: **Views** (not “Presets”)

## Event bus (Right → Left)

| Event | When | Left does |
|-------|------|-----------|
| `tactical-ow:view-config` | Heading / FOV / name `input` | `drawCameraFov(azimuth, fov)` + compass |
| `tactical-ow:view-locked` | **Use this view** | Persist spatial + draw FOV + glass pins |
| `tactical-ow:manual-override` | PTZ pad pan while locked | Clear FOV + hide pins + show banner |
| `tactical-ow:view-cleared` | Close / cam change / idle | Clear FOV + hide banner |

```
[Save View sliders] --emit view-config--> [Left map drawCameraFov]
[Use this view]     --emit view-locked--> [pins + FOV + store]
[PTZ pan]           --emit manual-override--> [suspend overlays + banner]
```

## UI

- Save View panel: **View name**, **Heading** slider, **FOV** slider  
- `.ar-glass` UV pins (unchanged %)  
- Banner: *Manual Control Active - Overlays Suspended. Select a View to restore.*

## Files

- `public/js/tactical-overwatch.js`
- `public/js/tactical-ar.js`
- `public/index.html`
- `public/css/global.css`
- `public/locales/en.json`
- `scripts/verify-tactical-overwatch-fov-compass-v1.js`

**Cache:** `?v=20260725-tactical-overwatch-save-view-sync-v1`  
**Verify:** `npm run verify:tactical-overwatch-fov` (+ `verify:tactical-ptz-ar`)

## Smoke (plain)

1. **Ctrl+F5**  
2. Tactical → **Overwatch (AR)**  
3. Drag **Heading** / **FOV** — cone on left map should move live (cam needs GPS)  
4. **Use this view** — markers if pins set  
5. PTZ pan — banner appears; cone + markers gone  
6. Select View again + **Use this view** — overlays restore  

Say **PASS** or **FAIL**.  
**Do not start Phase 3** until PASS + your go-ahead.
