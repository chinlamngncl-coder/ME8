# MOB-APPLIED BWC-WALL-PANEL-ASSIGN-HONEST-OPEN-V1 (2026-07-27)

## Goal

Stop the Settings → BWCs “Video Wall (6/8 Panels)” confusion: rename to honest **Assign wall panels…**, hint that it is panel assignment (same as wall Config), and always land on Ops with the wall drawer expanded before opening the overlay.

## Changes

- `public/js/server-setup.js` — `expandOpsVideoWallDrawer`, `openWallPanelAssignFromSettings` (ops + expand + `VideoConfig.openPanel`)
- `public/index.html` — button fallback + hint; cache bust
- `public/locales/{en,zh,ko,fil,id,th}.json` — rename + `server.openVideoWallHint`

## Operator check

1. Hard refresh once (`?v=20260727-bwc-wall-panel-assign-honest-open-v1`)
2. Settings → BWCs → button reads **Assign wall panels…**; hint visible under actions
3. Click → leave Settings → Ops map → wall expanded → panel-assignment overlay visible
4. Ops wall **Config** still opens the same overlay; live pin/Call/PTT unchanged

## Verify

```bash
node scripts/verify-bwc-wall-panel-assign-honest-open-v1.js
```
