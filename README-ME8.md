# ME8 — Mobility Enterprise 8 BWC

**Folder:** `ME8` (`C:\Users\user\Desktop\Enterprise Mobility\ME8`)  
**Future lock ID:** `me8-v1` (not locked yet)  
**Seeded from:** `Lab-8BWC-v2` baseline **`8wc-v2`**

Single **forward lane** for enterprise + 8 BWC + security hardening → product ship.

---

## Sibling trees

| Folder | Role |
|--------|------|
| **SaaS Mobility** | Trial ship — users testing (`:3888`) |
| **Lab-8BWC-v2** | Lab archive — lock ID `8wc-v2`; `RUN RESTORE-8WC-V2` |

All new **MOB-APPLY** work targets **ME8** unless you say otherwise.

---

## Run

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\RESTART-FLEET.bat
```

Dashboard: `http://<HOST>:3988` (trial ship uses `:3888`)

Stop trial Fleet before real BWC tests (shared SIP/FTP).

---

## MOB log

| MOB ID | Date | What |
|--------|------|------|
| `mob-me8-v1-scaffold` | 2026-06-30 | Seeded from 8wc-v2; HTTP 3988 |
| `mob-enterprise-mobility-rehome` | 2026-06-30 | Under `Enterprise Mobility\` parent |
| `mob-me8-rename-folder` | 2026-06-30 | Folder `ME8` (was Mobility Enterprise 8BWC V1) |
| `mob-me8-smoke-checklist` | 2026-06-30 | `docs/ME8-SMOKE-CHECKLIST.md` — Phase A sign-off |
| `mob-me8-logo-png-fix` | 2026-06-30 | `ubitron-logo.png` from trial pack; index + login `.png` only |
| `mob-me8-pack-skeleton` | 2026-06-30 | `pack/me8-fresh/`, `NEW-ME8-INSTALL.ps1`, `VERIFY-ME8-FRESH.ps1` |
| `mob-me8-ship-build-customer` | 2026-07-01 | `BUILD-ME8-CUSTOMER.ps1` — ship desk pack builder |
| `mob-me8-license-ops-doc` | 2026-07-01 | `docs/LICENSE-OPERATIONS.md`, `pack/me8-ship/ship-registry.*` |

**Fresh customer install (operators):** [CUSTOMER-START.txt](CUSTOMER-START.txt) → [docs/ME8-CUSTOMER-INSTALL.md](docs/ME8-CUSTOMER-INSTALL.md)

**Partner on site:** [docs/ME8-INSTALLER-RUNBOOK.md](docs/ME8-INSTALLER-RUNBOOK.md) — `SETUP-ME8.bat`

**Commercial install model:** [docs/ME8-COMMERCIAL-INSTALL-PLAN.md](docs/ME8-COMMERCIAL-INSTALL-PLAN.md)

**Customer pack (Ubitron ship desk):** `.\BUILD-ME8-CUSTOMER.ps1` — [docs/ME8-INTERNAL-SHIP-DESK.md](docs/ME8-INTERNAL-SHIP-DESK.md), [docs/LICENSE-OPERATIONS.md](docs/LICENSE-OPERATIONS.md)

**Roadmap:** [docs/ME8-ROADMAP.md](docs/ME8-ROADMAP.md)  
**Smoke (run before enterprise):** [docs/ME8-SMOKE-CHECKLIST.md](docs/ME8-SMOKE-CHECKLIST.md)  
**Security (before customer handoff):** [docs/ME8-SECURITY-BASELINE.md](docs/ME8-SECURITY-BASELINE.md)  
**HTTPS (customer IT appendix):** [docs/ME8-TLS-IT-APPENDIX.md](docs/ME8-TLS-IT-APPENDIX.md)  
**TLS internal / bench:** [docs/ME8-TLS-DASHBOARD.md](docs/ME8-TLS-DASHBOARD.md)  
**ZLM live sidecar plan:** [docs/ME8-ZLM-LIVE-MVP.md](docs/ME8-ZLM-LIVE-MVP.md)  
**ZLM sidecar setup (internal):** [docs/ME8-ZLM-SIDECAR-SETUP.md](docs/ME8-ZLM-SIDECAR-SETUP.md)  
**License (ship desk internal):** [docs/LICENSE-OPERATIONS.md](docs/LICENSE-OPERATIONS.md)  
**Compose layout:** [docs/ME8-COMPOSE-LAYOUT.md](docs/ME8-COMPOSE-LAYOUT.md) — `.\SMOKE-COMPOSE.ps1`  
**Enterprise env:** [docs/ME8-ENV-ENTERPRISE.md](docs/ME8-ENV-ENTERPRISE.md) — `.env.enterprise.example`  
**Stability debounce:** [docs/ME8-STABILITY-DEBOUNCE.md](docs/ME8-STABILITY-DEBOUNCE.md) — on by default in ME8 `.env`  
**Enterprise MOBs:** [docs/google-feedback-discussion/03-ENTERPRISE-PRE-SHIP-PLAN.md](docs/google-feedback-discussion/03-ENTERPRISE-PRE-SHIP-PLAN.md)  
**Review gate:** [docs/google-feedback-discussion/05-REVIEW-GATE-BEFORE-SHIP.md](docs/google-feedback-discussion/05-REVIEW-GATE-BEFORE-SHIP.md)

See `BASELINE-ME8-V1.md`.
