# MOB DISC — Enterprise SaaS & multi-tenant architecture (dual mode)

**Date:** 2026-07-26  
**Status:** **LOCKED ROADMAP** — Steps 2–4 **not coded** until named APPLY  
**Step 1 APPLY:** `TENANT-MIDDLEWARE-AND-CSS-REVIEW-V1`

---

## Dual mode

| Mode | Meaning |
|------|---------|
| `cloud_leased` | Ubitron-hosted tenant; hide Server/Network infra chrome; license + org silo |
| `on_prem` | Customer box; full infra UI; SSL upload (Step 2); same license engine |

Unified ME8 codebase. Separate **Master SaaS Portal** (Step 4) provisions `org_id` + Ed25519 `license.lic` into shared DB — network-isolated from tenant desks.

---

## Security pillars

1. Multi-tenant **data silos** (`org_id`)  
2. Zero-trust **WebSocket rooms** (`org:<orgId>`) — no cross-tenant `io.emit` when isolation on  
3. **RBAC** Admin / Operator / Viewer (Step 3 UI)  
4. Air-gap **Ed25519** `license.lic` (existing `licenseManager`) + quotas on `req` / socket  

---

## UI/UX mandates (CRITICAL — all future SaaS/settings UI)

1. **Unified dark theme** — match Settings / Cloud Deployment palette (`#0f172a`, `#1e293b`, `#334155`, accent blue).  
2. **Containment (no East-to-West stretch)** — forms/tables/panels: `max-width` (e.g. 420px fields, ~960–1100px panels); grid/flex; never full-bleed widescreen forms.  
3. **Proper padding & sizing** — tabs/buttons: content-sized padding; **no** tiny label on a massive full-width blue block (Cloud Deployment tab class of bug).  

Reference CSS today: `public/css/settings-theme-unify.css`, inline `#ss-panel-cloud` / `.ss-east-west-grid` / `.ss-network-section-nav` in `public/index.html`.

---

## Execution steps

| Step | Scope | Status |
|------|--------|--------|
| **1** | CSS analysis + Express/Socket Ed25519 tenant middleware + org rooms | **THIS APPLY** |
| **2** | `DEPLOYMENT_MODE` strip infra for cloud; SSL upload for on_prem + UI mandates | **APPLIED** `DYNAMIC-FRONTEND-UI-V1` |
| **3** | Contained Users & Roles table (Admin/Operator/Viewer) | **Parked** |
| **4** | Standalone Master Admin Portal (license inject + org provision) | **Parked** |

Do **not** start Steps 2–4 without explicit `MOB-APPLY`.
