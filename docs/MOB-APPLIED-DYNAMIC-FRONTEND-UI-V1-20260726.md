# MOB-APPLIED — DYNAMIC-FRONTEND-UI-V1

**Date:** 2026-07-26  
**APPLY:** `MOB-APPLY DYNAMIC-FRONTEND-UI-V1`  
**Roadmap Step 2:** `docs/MOB-DISC-ENTERPRISE-SAAS-MULTI-TENANT-ROADMAP-20260726.md`

## Delivered

### 1) CSS containment

- `#server-setup-panel` → `max-width: 1100px` (also `.ss-layout-wide` / `.ss-layout-admin`)
- `.ss-east-west-grid` / network grids capped at 1100px
- Left nav + Cloud sibling tabs: `flex: 0 0 auto`, `width: auto`, padding `6px 10px` — active blue hugs label (no full-row slab)
- Files: `public/css/settings-theme-unify.css`, inline overrides in `public/index.html`

### 2) `DEPLOYMENT_MODE` toggle

| Mode | UI |
|------|-----|
| `on_prem` (default / lab) | All tabs; SSL section visible |
| `cloud_leased` | Hide Server (`ss-main-tab-server` / panel), LAN & WAN (Network), Inbound checklist |

Source (`lib/deploymentMode.js`):

1. `FM_DEPLOYMENT_MODE` / `DEPLOYMENT_MODE` env  
2. Else `license.lic` payload `deploymentMode`  
3. Else `on_prem`

Exposed on `GET /api/server-settings` and `GET /api/platform/status` as `DEPLOYMENT_MODE` + `saasDeployment`.

Frontend: `applySaasDeploymentChrome` in `public/js/server-setup.js`.

### 3) SSL Configuration scaffold (on_prem Server tab)

- Section `ss-section-ssl` + sticky nav button  
- File inputs: `#ss-ssl-cert` (.crt), `#ss-ssl-key` (.key)  
- Form `max-width: 420px`, dark theme borders  
- **Scaffold only** — no server apply/save of certs in this MOB

## Cache

`?v=20260726-dynamic-frontend-ui-v1` on theme CSS + `server-setup.js`

## Verify

```text
npm run verify:dynamic-frontend-ui
```

## Operator smoke

1. Restart Fleet → Ctrl+F5  
2. **Default lab (`on_prem`):** Server Config → Network & deployment → SSL Configuration shows two file pickers; left nav tabs hug text; panel not ultrawide-stretched  
3. Optional cloud test: set `FM_DEPLOYMENT_MODE=cloud_leased` in `.env`, restart → Server / LAN / WAN / Inbound checklist gone  

Reply **PASS** / **FAIL**.

## Next (parked)

- Step 3: Users & Roles table  
- SSL **apply** MOB (write certs + reload HTTPS)  
- Step 4: Master SaaS Portal  
