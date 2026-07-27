# MOB-APPLIED CLOUD-DEPLOYMENT-GRID-UNIFY (2026-07-27)

## Goal

Un-cramp Cloud Deployment tab: Target A structure only (`ss-config-section` + `h4` + `ss-east-west-grid`). No new layout CSS. No ID / name / JS binding changes.

## Changes

- `public/index.html` — `#ss-panel-cloud` Site identity, Public access & topology, Central entitlement verification blocks

## Operator check

1. Hard refresh Settings → Cloud Deployment  
2. Site identity / Public access / Verification use section headers + east-west field columns  
3. Labels sit above inputs with spacing; Save / verify still work

## Verify

```bash
node scripts/verify-cloud-deployment-grid-unify.js
```
