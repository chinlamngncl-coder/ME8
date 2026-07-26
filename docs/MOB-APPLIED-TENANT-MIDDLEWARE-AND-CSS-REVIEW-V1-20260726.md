# MOB-APPLIED — TENANT-MIDDLEWARE-AND-CSS-REVIEW-V1

**Date:** 2026-07-26  
**APPLY:** `MOB-APPLY TENANT-MIDDLEWARE-AND-CSS-REVIEW-V1`  
**Roadmap:** `MOB-DISC-ENTERPRISE-SAAS-MULTI-TENANT-ROADMAP-20260726.md`  
**Steps 2–4:** **not started** (parked until APPLY)

---

## 1) CSS analysis summary (Cloud Deployment / Settings)

| Area | File / selector | Finding |
|------|-----------------|--------|
| Theme | `settings-theme-unify.css`, `#ss-panel-cloud` | Dark navy panels (`#0f172a`), borders `#334155` — **keep** |
| Fields | `#ss-panel-cloud label input` | `max-width: 420px` — **good containment** |
| East-West | `.ss-east-west-grid`, `.ss-network-grid` | `repeat(auto-fit, minmax(350px, 1fr))` — can still **span full workspace** on ultrawide; panels need an outer `max-width` (~960–1100px) |
| Shell | `#server-setup-panel` | `max-width: none; width: 100%` — **root of East-to-West stretch** |
| Tabs | `.ss-network-section-nav button` | Content padding OK; Cloud main tab can look like a **wide active slab** if flex-grow / full-row styles apply — mandate: **width:auto; flex:0 0 auto; padding ~6–10px** |
| Cards | `.cd-entitlement-card`, `.cd-program-phase` | Contained dark cards — **good pattern for Step 2–3 UI** |

**Mandate confirmed for Steps 2–3:** unified dark theme; outer panel max-width; field max 420px; tabs/buttons content-sized — no full-bleed colored word blocks.

*(This APPLY = review only for CSS; visual tab shrink is Step 2 unless you APPLY a CSS-only follow-up.)*

---

## 2) Backend delivered

| Piece | Path |
|-------|------|
| Context | `lib/tenantContext.js` — Ed25519 entitlements → `orgId` + limits |
| Express | `attachTenantContext`, `requireValidTenantLicense`, `requireValidLicenseWhenEnforced` |
| Socket | `socketTenantGuard` + `joinOrgRoom` → `org:<orgId>` |
| Emit wrap | `lib/tenantIo.js` — `io.emit` → active org room (default on); `io.emitToOrg` |
| Wire | `server.js` |
| License | optional `orgId` in `license.lic` canonical payload (old licenses unchanged) |

### Env

| Env | Effect |
|-----|--------|
| `FM_ORG_ID` | Override / lab default org (default `default`) |
| `FM_TENANT_LICENSE_ENFORCE=1` | Strict 403 on `/api` when license invalid (also when air-gap required) |
| `FM_TENANT_SOCKET_ISOLATE=0` | Disable emit→room wrap (debug only) |

### Lab safety

No license + air-gap off → **lab-open**: `orgId=default`, quotas unlimited, API not 403.  
Sockets still join `org:default`; emits go to that room (= single-tenant safe).

### 403 body (plain English)

`{ ok: false, error: "License invalid or missing.", code: "ERR_LIC_INVALID" }` — no DOCTYPE/JSON parser text.

---

## Verify

```text
npm run verify:tenant-middleware-css-review
```

## Operator

Restart Fleet once. Normal lab login should still work.  
No Step 2 UI changes in this APPLY.

## Next (parked)

- Step 2: `DEPLOYMENT_MODE` + SSL upload UI (mandates)  
- Step 3: Users & Roles table  
- Step 4: Master SaaS Portal  
- Also queued: `TACTICAL-BLUEPRINT-ZERO-RAW-ERRORS-V1`
