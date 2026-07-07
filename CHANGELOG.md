# Changelog — Ubitron Mobility C2

All notable changes to this product are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

- wvp-GB28181-pro integration (Gate C — tender scale camera ingestion)
- Playback broker fallback (ZLM primary + FFmpeg fallback descriptor)
- OSM map attribution restore
- Replace ftp-srv with maintained alternative (ip package has no patch)

---

## [1.0.2] — 2026-07-07 — Security hardening

### Security
- Added HTTP security headers: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`
- Removed `X-Powered-By: Express` header — server fingerprint no longer exposed
- Added login rate limiter — blocks an IP after 10 failed attempts for 15 minutes; applies to all three login endpoints (`/api/auth/login`, `/api/auth/login/totp`, `/api/tech/login`)

---

## [1.0.1] — 2026-07-07 — Security patch

### Security
- Fixed `ws` memory exhaustion DoS (GHSA-96hv-2xvq-fx4p) via `npm audit fix`
- Fixed `nodemailer` SMTP injection and SSRF vulnerabilities — upgraded to v9.0.3 (GHSA-mm7p-fcc7-pg87 and 7 others)
- Fixed `uuid` buffer bounds issue (GHSA-w5hq-g745-h8pq) via package.json override to v11
- Documented `ip` (via ftp-srv) as accepted risk — no patch available upstream; internal LAN only, low exploitability

- wvp-GB28181-pro integration (Gate C — tender scale camera ingestion)
- Playback broker fallback (ZLM primary + FFmpeg fallback descriptor)
- OSM map attribution restore
- Full npm audit pass and CVE remediation log

---

## [1.0.0] — 2026-07-07

First production-ready release. Enterprise ship baseline.

### Fleet management
- BWC device registration, GPS tracking, battery and health telemetry
- Live map with device pins, groups, and clustering
- Device lifecycle management — onboarding, assets, firmware inventory

### Communications
- Push-to-Talk (PTT) group voice broadcast over SIP
- Video conference rooms (LiveKit-compatible, LAN-only)
- SOS alert pipeline with dispatch scope — operators see only their group's incidents
- SOS ledger with CSV export, scoped by operator group

### Evidence
- Evidence hub — upload, tag, review workflow
- Redact with draft note — apply and release redaction with audit trail
- Live video command wall (operator-facing)

### Centre Summary AI
- Local AI assistant — offline, no internet required
- Qwen 2.5 1.5B (Apache 2.0) — commercially safe, bundled in installer
- Install progress indicator on first server start
- Blocked commercially unsafe model variants at runtime

### Security
- Super admin TOTP (time-based one-time password) — 2FA at login
- Must-change-password flow on first login
- Recovery email for locked accounts
- Secrets vault — passwords encrypted at rest, not stored in plain text
- Audit trail — every admin action logged with timestamp and operator identity
- Dashboard auth with role-based access (super admin / operator / scoped operator)
- Platform license enforcement

### Compliance & legal
- Legal Notices page in Settings — clean enterprise-style OSS acknowledgements
- Third-Party Notices document for customer contracts
- FFmpeg swapped from GPL to LGPL vendor build — commercially safe
- Qwen 3B / 72B model variants blocked — only Apache 2.0 model ships
- Open Source License Audit documented

### Ship tooling
- `VERIFY-ME8-FRESH.ps1` — hard-fails if media engine or AI model missing from pack
- `BUILD-ME8-CUSTOMER.ps1` — customer pack builder with license injection
- `PACK-ME8-SKELETON.ps1` — confidential artifact denylist enforced before zip
- `download-ffmpeg-lgpl.ps1` — vendor download script for LGPL media engine
- `download-centre-llm.ps1` — vendor download script for AI model

### Infrastructure (lab / server-side)
- ZLM media server Docker stack (Gate B — PASS 2026-07-06)
- wvp-GB28181-pro Docker scaffold (Gate C — tender scale, lab only)
- Valkey (BSD 3-Clause) used in place of Redis (SSPL) throughout

---

## Version policy

| Version bump | When |
|---|---|
| `1.0.x` | Bug fix — safe to deploy, no feature changes |
| `1.x.0` | New feature or module added |
| `x.0.0` | Major architectural change — requires re-testing |

Critical security patches are released as `1.0.x` and customers are notified by support email within 72 hours of discovery.
