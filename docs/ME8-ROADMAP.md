# ME8 roadmap — commercial Enterprise 8 BWC

**Tree:** `C:\Users\user\Desktop\Enterprise Mobility\ME8`  
**Ship lock (future):** `me8-v1`  
**Seeded from:** `Lab-8BWC-v2` / lock `8wc-v2` (2026-06-30)

This is the **only forward lane** for product work. Trial and lab trees stay frozen unless you explicitly port a MOB.

---

## Sibling trees (do not stack MOBs here)

| Folder | Role |
|--------|------|
| `Enterprise Mobility\SaaS Mobility` | Trial customers — `trial-gold-1.10.1`, HTTP `:3888` |
| `Enterprise Mobility\Lab-8BWC-v2` | Lab archive — lock `8wc-v2`; rollback only |

---

## Version names (keep it simple)

| Name | Meaning |
|------|---------|
| **ME8** | This folder — integration + ship |
| **me8-v1** | First **commercial** baseline lock (after review gate) |
| **8wc-v2** | Lab history only — donor seed, not the product lock |
| **trial-gold-*** | Trial ship only — not ME8 |

Legacy doc **03** may say `trial-gold-2.0-enterprise`; for ME8 read that as **`me8-v1`** on this tree.

---

## Phase A — Foundation (before Valkey/Postgres in Fleet)

Structure and sign-off. **No app wiring** to enterprise DB/cache yet.

| MOB ID | Status | What |
|--------|--------|------|
| `mob-me8-roadmap-doc` | Done | This file + `docs/google-feedback-discussion/` in ME8 |
| `mob-me8-smoke-checklist` | Done | [ME8-SMOKE-CHECKLIST.md](./ME8-SMOKE-CHECKLIST.md) — Phase A exit sign-off |
| `mob-me8-compose-layout` | Done | [ME8-COMPOSE-LAYOUT.md](./ME8-COMPOSE-LAYOUT.md) + `SMOKE-COMPOSE.ps1` |
| `mob-env-enterprise` | Done | `.env.enterprise.example`, `lib/enterpriseEnv.js`, [ME8-ENV-ENTERPRISE.md](./ME8-ENV-ENTERPRISE.md) |
| `mob-stability-debounce-default` | Done | `FM_USE_CACHE_DEBOUNCE=1` in ME8 ship `.env` — [ME8-STABILITY-DEBOUNCE.md](./ME8-STABILITY-DEBOUNCE.md) |
| `mob-stability-async-cache` | Done | `fs.promises` GPS/contact flush; debounce unchanged — [ME8-STABILITY-DEBOUNCE.md](./ME8-STABILITY-DEBOUNCE.md) |
| `mob-me8-vendor-local` | Done | Leaflet + MarkerCluster + LiveKit in `public/vendor/` — dashboard loads without CDN |
| `mob-me8-defer-scripts` | Reverted | Was defer-all; **`mob-me8-revert-defer-boot`** restored blocking scripts + `dashboard-boot.js` last |
| `mob-me8-revert-defer-boot` | Done | Blocking `<script src>` (trial load path); DCL target ~300 ms like `:3888` |
| `mob-me8-settings-instant` | Done | Settings config show-first; session cache; lazy tab loads (`server-setup.js`) |
| `mob-me8-tech-admin-link-fix` | Done | Tech admin → in-dashboard Diagnostics (not missing `admin.html`) |
| `mob-me8-tech-gate-escape` | Done | Tech PIN Cancel/Esc → Settings home; config opens only after unlock |
| `mob-me8-tech-copy-enterprise` | Done | Enterprise tech alerts — no env var / restart copy in UI or API |
| `mob-me8-tech-pin-provision` | Done | Super admin sets engineer PIN in dashboard → encrypted vault (`techAccess.provisionPin`) |
| `mob-me8-tech-provision-routes` | Done | All diagnostics entry paths use `runWithTechAccess` (provision before PIN gate) |
| `mob-me8-tech-provision-input-fix` | Done | Provision dialog enables PIN fields on show (`setModalA11y`) |
| `mob-me8-reverify-ttl-5m` | Done | Server config reverify token TTL **30 min → 5 min** (`lib/authReverify.js`) |
| `mob-me8-vc-lazy` | Done | LiveKit + conference scripts load only on VC tab (`vc-lazy.js`) |
| `mob-me8-vc-lazy-fix` | Done | Re-apply session perms + force refresh after lazy VC load (`evidence-manager.js`) |
| `mob-me8-status-connect-throttle` | Done | Login socket replay: cached telemetry, stagger 800+900ms, max 3 forced status polls |
| `mob-me8-settings-click-guard` | Done | Settings nav lock, modal stack cleanup, auth gate dismiss |
| `mob-me8-static-cache` | Done | `Cache-Control` on `/js`, `/vendor`, `/locales` — [ME8-STABILITY-DEBOUNCE.md](./ME8-STABILITY-DEBOUNCE.md) |
| `mob-me8-tab-lifecycle` | Done | Sticky dashboard tabs — `tab-lifecycle.js`; hubs skip refetch on revisit (60s stale) |
| `mob-me8-env-profile` | Done | `.env.me8.example`, lab camIds out of `.env`, `RESTART-FLEET.bat` → 3988 |
| `mob-me8-ops-runtime` | Partial | SOS fast lane kept; `ops-admin-lazy` reverted by **`mob-me8-restore-defer-tabs`** |
| `mob-me8-restore-defer-tabs` | Superseded | Defer left `ServerSetup.init` racing before `server-setup.js` — settings stuck |
| `mob-me8-blocking-boot` | Superseded | Admin-before-ops parse order — live late |
| `mob-me8-ops-first-boot` | Done | Ops/video/map blocking first; settings glue; heavy admin defer |
| `mob-me8-sos-ptt-auto-restore-on-ack` | Done | Ack dismiss → SOS PTT team cleared + 1:1 restore; dispatch group PTT untouched |
| `mob-me8-sos-video-priority` | Reverted | Restored by `mob-me8-restore-8wc-v2-ops` |
| `mob-me8-restore-8wc-v2-ops` | Done | Lane 2 — v2 inline ops boot; ME8 enterprise glue + vc-lazy |
| `mob-me8-post-restore-checklist` | Done | [ME8-POST-RESTORE-CHECKLIST.md](./ME8-POST-RESTORE-CHECKLIST.md) — test then confirm re-MOBs |
| `mob-me8-docs-trim` | Pending | ME8 ops doc; reduce lab README noise |
| `mob-me8-security-baseline` | Done | [ME8-SECURITY-BASELINE.md](./ME8-SECURITY-BASELINE.md) — pre-ship SOP + checklist |
| `mob-me8-pack-skeleton` | Done | `pack/me8-fresh/`, `NEW-ME8-INSTALL.ps1`, `VERIFY-ME8-FRESH.ps1`, `PACK-ME8-SKELETON.ps1` |
| `mob-me8-settings-secrets-redact` | Done | `storage/secrets/` vault; no passwords in API responses |
| `mob-me8-force-password-change` | Done | First-login password gate; `global123` blocked after change |
| `mob-me8-password-policy` | Done | 12+/14+ rules, history, no paste on dashboard auth fields |
| `mob-me8-totp-2fa` | Done | Offline TOTP for super admin; login second step; backup codes |
| `mob-me8-secrets-at-rest` | Done | AES-256-GCM vault + DPAPI key + `LOCK-SECRETS-ACL.ps1` |
| `mob-me8-auth-reverify` | Done | Password re-check on server/FTP/users/evidence saves (**5 min** reverify token) |
| `mob-me8-settings-secrets-redact` | Done | `storage/secrets/` vault; no passwords in API or `server-settings.json` |

**Exit Phase A:** ME8 smoke signed off on real BWCs at `:3988`.

---

## Phase B — Enterprise (MOB order)

One **MOB-APPLY** at a time. Detail in [03-ENTERPRISE-PRE-SHIP-PLAN.md](./google-feedback-discussion/03-ENTERPRISE-PRE-SHIP-PLAN.md).

| Wave | MOBs | Notes |
|------|------|-------|
| **0** | `mob-me8-aes256-verify`, `mob-me8-tls-dashboard`, `mob-enterprise-compose` (file present), `mob-env-enterprise` | Vault + HTTPS docs/scripts; then Valkey + Postgres env |
| **1** | stability MOBs | Debounce, async cache, fatal policy |
| **2** | Valkey dual-write + hydrate | SOS/live/PTT **never blocked** |
| **3** | Postgres catalog + degrade | No silent SQLite split-brain — [07](./google-feedback-discussion/07-DEGRADE-TESTS-AND-PG-RESYNC.md) |
| **4** | Review gate → lock **`me8-v1`** | [05-REVIEW-GATE-BEFORE-SHIP.md](./google-feedback-discussion/05-REVIEW-GATE-BEFORE-SHIP.md) |

---

## ME8 product scope (commercial v1)

**In scope (already seeded or planned):**

- 8 concurrent live wall  
- SOS PTT team path  
- Wall slot isolation  
- Offline maps / MapLibre / geofence OUT pin  
- Valkey + Postgres single-node enterprise kit  
- Stability + security gate  

**Out of scope for me8-v1 (later / sidecar):**

- WVP + ZLM merged into `server.js`  
- Multi-tenant SaaS control plane  
- SIP/media cluster / NLB farm  

**In progress (sidecar — not merged):** [ME8-ZLM-LIVE-MVP.md](./ME8-ZLM-LIVE-MVP.md) — ZLM media sidecar; Fleet keeps SIP/PTT/SOS

---

## Run ME8

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\RESTART-FLEET.bat
```

Dashboard: `http://<HOST>:3988` — stop trial Fleet before BWC SIP tests.

---

## Key documents

| Doc | Use |
|-----|-----|
| [ME8-ZLM-LIVE-MVP.md](./ME8-ZLM-LIVE-MVP.md) | ZLM sidecar plan — engine flag, migration, PASS gates |
| [ME8-SMOKE-CHECKLIST.md](./ME8-SMOKE-CHECKLIST.md) | Phase A smoke — before enterprise MOBs |
| [ME8-CHECKPOINT-RITUAL.md](./ME8-CHECKPOINT-RITUAL.md) | Mini/full checkpoint gate — agent reminds after risky MOBs |
| [ME8-FLEET-SCALE-SOP.md](./ME8-FLEET-SCALE-SOP.md) | Many registered BWCs, 8 live — operator/partner SOP |
| [ME8-ZLM-SCALE-8-CHECKLIST.md](./ME8-ZLM-SCALE-8-CHECKLIST.md) | 8 concurrent + ZLM failover drills |
| [ME8-COMPOSE-LAYOUT.md](./ME8-COMPOSE-LAYOUT.md) | Host Fleet + Docker Valkey/Postgres/LiveKit ports |
| [ME8-ENV-ENTERPRISE.md](./ME8-ENV-ENTERPRISE.md) | Enterprise `.env` profile (Wave 0) |
| [ME8-SECURITY-BASELINE.md](./ME8-SECURITY-BASELINE.md) | Pre-ship security SOP — before customer handoff |
| [ME8-ROADMAP.md](./ME8-ROADMAP.md) | This file — phases and MOB order |
| [ME8-POST-RESTORE-CHECKLIST.md](./ME8-POST-RESTORE-CHECKLIST.md) | After `mob-me8-restore-8wc-v2-ops` — test each reminder, confirm MOB or skip |
| [google-feedback-discussion/README.md](./google-feedback-discussion/README.md) | Enterprise discussion pack index |
| [03-ENTERPRISE-PRE-SHIP-PLAN.md](./google-feedback-discussion/03-ENTERPRISE-PRE-SHIP-PLAN.md) | Wave 0–4 implementation |
| [05-REVIEW-GATE-BEFORE-SHIP.md](./google-feedback-discussion/05-REVIEW-GATE-BEFORE-SHIP.md) | Sign-off before `me8-v1` lock |
| [07-DEGRADE-TESTS-AND-PG-RESYNC.md](./google-feedback-discussion/07-DEGRADE-TESTS-AND-PG-RESYNC.md) | Valkey/PG failure tests |
| [../README-ME8.md](../README-ME8.md) | Quick start |
| [../BASELINE-ME8-V1.md](../BASELINE-ME8-V1.md) | Lock placeholder |

---

## MOB log

| MOB ID | Date | What |
|--------|------|------|
| `mob-me8-roadmap-doc` | 2026-06-30 | `docs/ME8-ROADMAP.md` + enterprise doc pack in ME8 |
| `mob-me8-smoke-checklist` | 2026-06-30 | `docs/ME8-SMOKE-CHECKLIST.md` — Phase A sign-off |
| `mob-me8-pack-skeleton` | 2026-06-30 | Factory storage template + fresh install / verify / pack skeleton scripts |
| `mob-me8-settings-secrets-redact` | 2026-06-30 | `lib/serverSecrets.js` — vault under `storage/secrets/`; APIs never return passwords |
| `mob-me8-force-password-change` | 2026-06-30 | Forced password change on first login; `global123` dead after change |
| `mob-me8-password-policy` | 2026-06-30 | Enterprise password rules, 5-password history, auth-field paste block |
| `mob-me8-totp-2fa` | 2026-06-30 | Offline TOTP (super admin required); enroll gate; login challenge + backup codes |
| `mob-me8-secrets-at-rest` | 2026-06-30 | Encrypted `server-secrets.json` (AES-256-GCM); DPAPI key file; Windows ACL script |
| `mob-me8-auth-reverify` | 2026-06-30 | Reverify token + API enforcement on server/FTP/users/evidence/cloud saves |
| `mob-me8-security-baseline` | 2026-06-30 | `docs/ME8-SECURITY-BASELINE.md` — ship SOP, secrets, FTP/SIP, sign-off |
| `mob-me8-compose-layout` | 2026-06-30 | Compose layout doc + `SMOKE-COMPOSE.ps1` (Valkey/Postgres/LiveKit) |
| `mob-env-enterprise` | 2026-06-30 | Enterprise env template + `lib/enterpriseEnv.js` validator (no Fleet wiring) |
| `mob-stability-debounce-default` | 2026-06-30 | Ship profile `FM_USE_CACHE_DEBOUNCE=1` + VERIFY + stability doc |
| `mob-stability-async-cache` | 2026-06-30 | Async `fs.promises` cache flush; sync final write on SIGINT/SIGTERM |
| `mob-me8-vendor-local` | 2026-07-01 | Local `/vendor/` for Leaflet, MarkerCluster, LiveKit (dashboard cold load) |
| `mob-me8-defer-scripts` | 2026-07-01 | Parallel script fetch via `defer`; `index.html` 682→384 KB |
| `mob-me8-static-cache` | 2026-07-01 | `lib/staticCache.js` — long-lived cache for versioned `/js` + `/vendor` |
| `mob-me8-aes256-verify` | 2026-07-04 | Bench verify: `test-secrets-at-rest.js` OK; live `me8-secrets-v2` / AES-256-GCM; `LOCK-SECRETS-ACL.ps1`; API redacts passwords |
| `mob-me8-tls-dashboard` | 2026-07-04 | HTTPS operator path: SETUP/VERIFY scripts, `me8-tls-proxy.js`, nginx/Caddy templates, `docs/ME8-TLS-DASHBOARD.md` |
| `mob-me8-secrets-enterprise-ui` | 2026-07-04 | Settings secrets UX: inline badges, save-stays-open, unsaved guard, effective `passwordConfigured`, silent env→vault hydrate |
| `mob-me8-secrets-copy-enterprise` | 2026-07-04 | Operator copy: **Password saved** / **Enter new password to change** — removed “not shown” from six locales + FTP hint |
| `mob-me8-customer-install-story` | 2026-07-04 | `CUSTOMER-START.txt`, `ME8-CUSTOMER-INSTALL.md`, `ME8-INSTALLER-RUNBOOK.md`; pack README split; no operator `.env`/verify steps |
| `mob-me8-no-env-in-handoff` | 2026-07-04 | Zero bootstrap file names in handoff; `ME8-INTERNAL-SHIP-DESK.md`; silent ship-desk script messages |
| `mob-me8-commercial-install` | 2026-07-04 | `SETUP-ME8.bat`, BUILD bundles `npm install`, `ME8-COMMERCIAL-INSTALL-PLAN.md`; partner path = copy + SETUP + URL |
| `mob-me8-tls-ship-integrate` | 2026-07-04 | Auto trust proxy when operator URL is https; `HANDOFF-SHEET.txt`; `ME8-TLS-IT-APPENDIX.md`; BUILD `-OperatorHttpsUrl` |
| `mob-me8-zlm-plan-doc` | 2026-07-04 | `docs/ME8-ZLM-LIVE-MVP.md` — sidecar architecture, `FM_LIVE_ENGINE`, ship-desk switch model, MOB 2–6 order |
| `mob-me8-zlm-plan-doc-amend-failover` | 2026-07-04 | Plan amend: ZLM primary + invisible ffmpeg fallback before ship; LiveMediaRouter; MOB 5 failover; PASS F1–F6 |
| `mob-me8-zlm-sidecar` | 2026-07-04 | `lib/zlmSidecar.js`, Start/VERIFY scripts, `docker/zlm.compose.yaml`, platform `zlm` status, RESTART autostart |
| `mob-me8-zlm-ingest-bridge` | 2026-07-04 | `liveMediaRouter`, `zlmIngestAdapter`, pool RTP hooks, parallel ZLM ingest (wall still ffmpeg) |
| `mob-me8-zlm-failover` | 2026-07-04 | `zlmFailover.js` — readiness/stall/circuit breaker; silent ffmpeg fallback logs |
| `mob-me8-zlm-wall-mvp` | 2026-07-04 | Unified `video-stream-ready` + ZLM FLV / ffmpeg JSMpeg dual player |
| `mob-me8-checkpoint-ritual` | 2026-07-04 | `docs/ME8-CHECKPOINT-RITUAL.md` + agent rule — CHECKPOINT PASS gate |
| `mob-me8-fleet-scale-sop` | 2026-07-04 | `docs/ME8-FLEET-SCALE-SOP.md` — registered vs online vs live (8 cap) |
| `mob-me8-zlm-scale-8` | 2026-07-04 | Live cap 6→8 aligned; `ME8-ZLM-SCALE-8-CHECKLIST.md` drills |
