# MOB-APPLIED — Task 3.4 Feature Entitlements & License Enforcement

**Date:** 2026-07-25  
**Execute / APPLY:** Task 3.4  
**Status:** Landed — await operator review (do not wrap Phase 3 yet)

## Goal

Enforce `license.lic` feature flags and camera/BWC caps on Express routes; expose a safe entitlements API; grey-out locked nav in the UI.

## What landed

| Piece | Path |
|-------|------|
| Helpers | `lib/licenseManager.js` — `hasFeature`, `checkFixedCamLimit`, `checkBwcLimit`, `getPublicEntitlements`, `isLabOpen` |
| Middleware | `lib/licenseEntitlementsMw.js` — `requireFeature`, `checkFixedCamCapacity`, `checkBwcCapacity` |
| API | `GET /api/license/entitlements` (auth) |
| Enforcement | `POST /api/fixed-cams`, CSV import → **403 `ERR_LIC_CAM_LIMIT_EXCEEDED`**; `POST /api/bwc-devices` → BWC cap; PTZ → `requireFeature('ptzControl')` |
| UI | `public/js/license-entitlements-ui.js` + CSS — Tactical / Analytics grey + **Upgrade License** badge |
| Verify | `npm run verify:license-entitlements` |

## Lab vs ship

| Mode | Behavior |
|------|----------|
| Lab (no `license.lic`, air-gap not required) | Fail-open: all features on, unlimited counts |
| Ship (`FM_AIRGAP_LICENSE_REQUIRED=1` + signed `.lic`) | Features only if `features.X === true`; cams/BWC capped |

## Feature names (in `.lic` `features`)

- `tacticalOverwatch` — Tactical nav  
- `analytics` — Analytics nav  
- `ptzControl` — fixed-cam PTZ API  

Generator: `--feature tacticalOverwatch --feature analytics --feature ptzControl`

## Operator smoke (plain)

1. Restart server, Ctrl+F5  
2. Lab (no license required): Tactical + Analytics usable; banner may stay hidden  
3. With a tight test license (`maxFixedCameras: 0` or low N): adding fixed cam past limit → error / 403  
4. License without `tacticalOverwatch`: Tactical tab grey + Upgrade License  

## Not wrapping Phase 3

Wait for your **PASS** before declaring Phase 3 complete.
