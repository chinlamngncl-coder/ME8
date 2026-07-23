# MOB APPLIED — REVERSE-PROXY-UI-POLISH-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-EXECUTE-REVERSE-PROXY-UI-POLISH-V1` (EXECUTE = APPLY)  
**Disc:** `MOB-DISC-HOW-TO-ON-TRUST-PROXY-SETTINGS-20260723.md`

## What landed

Same switch `#ss-trust-proxy` in **Settings → Server Config → Reverse proxy**. No new toggle. No `.env` for trust proxy.

| Piece | Change |
|-------|--------|
| Plain English | Hint + checkbox: “Turn ON only if HTTPS stops at nginx/Caddy…” |
| Help line | `#ss-trust-proxy-help` — OFF = direct; ON = front door then Save |
| Readiness box | `#ss-proxy-readiness` PASS / CHECK in-section |
| Site readiness | Honest PASS proxy / PASS direct / CHECK behind-proxy |
| Save | Status “Saved — Trust reverse proxy is ON/OFF”; button disable while saving |

## Files

- `public/index.html` — section copy + readiness UI + CSS  
- `public/locales/en.json` — strings  
- `public/js/server-setup.js` — render/save/load  
- `lib/siteReadiness.js` — `classifyTrustProxyReadiness`  
- `server.js` — `/api/production-access` returns `readiness`  
- `scripts/verify-reverse-proxy-ui-polish.js`

## Operator verify

1. Hard refresh Ops.  
2. Settings → Server Config → **Reverse proxy**.  
3. Read plain hint + help under checkbox.  
4. See PASS/CHECK box.  
5. Toggle → **Save** → status shows Saved ON or OFF.  
6. Site readiness “HTTPS / reverse proxy” matches (direct HTTPS `:4438` + OFF = PASS).

## Outside this MOB

Built-in `FM_HTTPS_*` still not a Settings form (separate question). Trust proxy remains UI-only.
