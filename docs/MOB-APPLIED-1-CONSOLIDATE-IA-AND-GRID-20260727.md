# MOB-APPLIED 1-CONSOLIDATE-IA-AND-GRID (2026-07-27)

## Goal

Replace the 12-pill Network & deployment jump nav with a **6-phase** scroll wizard. Target A classes only (`ss-config-section`, `ss-east-west-grid`, `h4`, `setup-hint`). Preserve all field IDs / JS bindings.

## Phases

1. Identity — deployment mode + tenant  
2. Networking — LAN, WAN, device registration  
3. Access & Security — operator portal, reverse proxy, SSL  
4. Storage & Devices — storage, protocol, timezone, control room  
5. Resiliency — site resilience  
6. Diagnostics — Site configuration status (`cd-readiness`) + Site readiness (`ss-site-readiness`)

## Changes

- `public/index.html` — `#ss-panel-server` DOM; move `cd-readiness` into Phase 6; cache bust  
- `public/js/server-setup.js` — `NETWORK_SECTION_IDS` → 6 phases; load overview + readiness on Server tab  
- `public/locales/en.json` — `server.phase.*` strings  

## Operator check

1. Hard refresh (`?v=20260727-consolidate-ia-and-grid-v1`)  
2. Settings → Network & deployment → **6** phase pills (not 12)  
3. Scroll/click phases; Identity / LAN / WAN / Access fields use east-west spacing  
4. Phase 6 shows both status cards; Save server settings still works  

## Verify

```bash
node scripts/verify-1-consolidate-ia-and-grid.js
```
