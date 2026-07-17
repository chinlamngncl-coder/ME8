# MOB APPLIED — safety-commit-keep-ops-wvp-infra

**Date:** 2026-07-17  
**APPLY:** `MOB-APPLY safety-commit-keep-ops-wvp-infra`  
**Disc:** `docs/MOB-DISC-OPERATOR-NEXT-APPLY-CHEATSHEET-20260717.md` step 2

## What

Local git commit of **ops / WVP infra / ZLM pack / Windows service** keep-pile so it cannot vanish when Soft Open storm is undone later.

## Included

- WVP LAN/proxy/register/presence helpers (`lib/wvp*.js`, `scripts/wvp-sip-lan-proxy.js`, `scripts/wvp-lab-post-start.js`)
- ZLM pack stubs (`scripts/INSTALL-ZLM-PACK.ps1`, `docker/wvp/zlm-bundled/`, `vendor/zlmediakit/` README/example)
- Windows service install/start/stop + `scripts/me8-ship/*` + bundled `nssm.exe`
- Fleet restart prefer-service + related restart/kill/env/settings (5062 dual-protocol lab notes)
- Small UI keep: `public/css/app-select-guard.css`
- Related APPLIED/DISC for service / presence / SIP 5062 / SEC log guards / ghost-pin / cheatsheet
- **Not** Soft Open wall/player/broker dirty storm files

## NEXT

```text
MOB-APPLY lab-git-push-ops-wvp-infra
```
