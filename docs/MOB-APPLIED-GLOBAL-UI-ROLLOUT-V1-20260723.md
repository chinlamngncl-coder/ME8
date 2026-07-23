# MOB APPLIED — GLOBAL-UI-ROLLOUT-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-EXECUTE-GLOBAL-UI-ROLLOUT-V1`  
**Disc:** `docs/MOB-DISC-GLOBAL-UI-ROLLOUT-V1-20260723.md`  
**Depends on:** END-TO-END-UI-CONSOLIDATION-V1 PASS

## What landed

### Design system (`public/css/global.css`)

- Global button bridge: `.btn.btn-action` / `.btn.btn-ghost` match `.btn-primary` / `.btn-secondary` on **all** pages (not only `.enterprise-scope`).
- Auth / legal shell styles (login, password, recovery, TOTP, legal notices).
- Cache: `?v=20260723-global-ui-rollout-v1`

### Pages — every `public/*.html` now loads `global.css`

| File | Change |
|------|--------|
| `login.html`, `must-change-password.html`, `recovery-email.html`, `verify-recovery-email.html`, `enroll-totp.html` | Inline `<style>` **removed**; `enterprise-auth` + `.enterprise-card` + `.btn-primary` / `.btn-secondary` |
| `legal-notices.html` | Inline style removed; `enterprise-legal` |
| `command-centre.html` | Link + `.enterprise-card` / button classes; uses `centre-summary.css` tokens |
| `command-wall.html`, `live.html`, `matrix.html` | Link + button/card classes; **page layout CSS kept** (video shells) |
| `test-*.html` | Link only (lab chrome kept) |
| `index.html` | `enterprise-scope` on Analytics, Evidence, Command Wall, Centre Summary, Audit Trail; cache bump |

### Explicitly not done (safety)

- Did **not** delete the giant `index.html` `<style>` (map / SOS / wall / pin would break).
- Did **not** touch `server.js`, SIP/PTT/WebRTC, `video-wall.js`, Leaflet JS, IDs/`data-*`, API routes.
- Ops map view left without full `enterprise-scope` (density / map chrome).

## Operator verify

1. **Ctrl+F5**
2. **Login** — same dark card / blue Sign in; no broken layout
3. **Dashboard** — Settings / Analytics / Evidence / Command Wall / Centre Summary buttons & cards match
4. **Popouts** — live / matrix / command-wall still play video
5. **Map / Open All** — unchanged

**PASS** = auth + shells share the same dark enterprise look as Analytics.  
**FAIL** = login broken, or map/live video regression.

## Operator result

**PASS** (2026-07-23) — operator confirmed.
