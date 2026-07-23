# THIRD-PARTY REVIEW HANDOFF — Security / legal / hardening (2026-07-22)

**Purpose:** Pass this file to an independent agent / reviewer for confirmation.  
**Repo:** ME8 (`ubitron-lab-8wc` / local `Enterprise Mobility/ME8`)  
**Branch context:** lab work through Valkey legal pin (see git status at review time)  
**Author agent claim:** Google-class security leftovers + Valkey legal path applied; remaining gaps listed honestly below.  
**Not legal advice:** engineering pin only — counsel owns final commercial license sign-off.

---

## How to use this (hardening method)

1. Treat every row as **claim** until you re-verify.  
2. Prefer **raw evidence**: file paths, `npm run verify*`, `npm audit`, compose image tags, code grep.  
3. Mark each item: **CONFIRMED** / **DISPUTED** / **STILL OPEN**.  
4. Do **not** trust chat summaries alone.

### Quick re-verify commands

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
npm audit --omit=dev
npm run verify
npm run verify:dependencies
npm run verify:redis-legal
npm run verify:valkey
rg -n "image:\s*redis:" docker --glob "*.yml" --glob "*.yaml"
rg -n "Math\.random\(" lib server.js --glob "*.js"
rg -n "createSipCallId|sipCryptoIdentifiers" lib server.js --glob "*.js"
```

Expected: `npm audit` **0** vulns; `npm run verify` **PASS**; active `docker/` has **no** `image: redis:7|8|latest`.

---

## A) DONE this session / recent genre (claim = APPLIED)

### A1 — Dependency / supply chain

| ID | MOB / work | Evidence | Status claim |
|----|------------|----------|--------------|
| SEC-DEP | `mob-sec-production-dependency-audit-fixes-v1` | `docs/MOB-APPLIED-SEC-PRODUCTION-DEPENDENCY-AUDIT-FIXES-V1-20260722.md`; `package.json` overrides `ip`→`@webpod/ip`; tar/brace-expansion/body-parser bumps | DONE — `npm audit` 0 |
| LEGAL-DEP | Legal notices updated for pg / Valkey / ioredis / @webpod/ip | `public/legal-notices.html`, `scripts/trial-ship/THIRD-PARTY-NOTICES.ship.md` | DONE |

### A2 — Process / auth / crypto hygiene

| ID | MOB / work | Evidence | Status claim |
|----|------------|----------|--------------|
| SEC-FATAL | `mob-sec-uncaught-exit` | `lib/fatalProcessPolicy.js`; fatal → exit(1) | DONE |
| SEC-SIP-1 | `mob-sec-sip-crypto-random` | `lib/sipCryptoIdentifiers.js` wired in `server.js` | DONE |
| SEC-SIP-2 | `mob-sec-sip-crypto-random-live-modules-v2` | crypto IDs in pttServer, mediaSession, liveStreamPool, deviceControl, sosResponseTeam, frFieldAlert, conferenceBwcIngress, wvpPttGroupRelay | DONE |
| SEC-LOGIN | `mob-sec-login-rate-lru` | `lib/loginRateLimiter.js` (5k LRU); trustProxy default **off** | DONE |
| SEC-RUNJS | `mob-sec-ship-runjs-security-parity-v1` | root `run.js` rebuilt; `scripts/verify-ship-runjs-security-parity.js` | DONE |

### A3 — Product fix (ops, not crypto)

| ID | MOB / work | Evidence | Status claim |
|----|------------|----------|--------------|
| SOS-ACK | `SOS-ACK-ENDS-GROUP-CALL-RESTORE-PTT-V1` | ACK stops SOS group call so PTT returns | DONE — operator PASS claimed |

### A4 — Enterprise Valkey (runtime + legal)

| ID | MOB / work | Evidence | Status claim |
|----|------------|----------|--------------|
| VALKEY-RT | `VALKEY-FLEET-RUNTIME-STATE-DEGRADE-V1` | `lib/redisRuntime.js`; dual-write GPS/online/contact; degrade; `/api/health` `cache` informational only | DONE — verify PASS |
| VALKEY-PIN | `ENTERPRISE-REDIS-IMAGE-LEGAL-PIN-V1` (**this APPLY**) | LiveKit + WVP + ship-pack LiveKit → `valkey/valkey:8-alpine`; `scripts/verify-enterprise-redis-image-legal-pin.js` | DONE — verify PASS |

**Valkey purpose (not a security control):** optional Fleet runtime cache for GPS/online/SIP contact. **Not** evidence backup. Unset `FM_REDIS_URL` = memory+JSON only. SOS/live/PTT must not depend on Valkey.

**License claim (Fleet + pinned images):**

| Component | License claim | Notes |
|-----------|---------------|-------|
| PostgreSQL 16.10 | PostgreSQL License | Permissive |
| `pg` | MIT | Client |
| Valkey 8 | BSD-3-Clause | Linux Foundation fork — avoids Redis 7.4+ SSPL/RSAL and Redis 8 AGPL options |
| `ioredis` | MIT | Client |
| Docker Hub `redis:7-alpine` floating | **Removed from active compose** | Was the legal time bomb |

---

## B) RAW / STILL OPEN (honest gaps — prioritize)

Reviewer: these are **not** claimed fixed.

### B1 — Lab / default credentials

| Item | Status |
|------|--------|
| LiveKit keys / ingress pin / WVP env secrets | **APPLIED** — `MOB-APPLIED-LAB-DEFAULT-CREDS-AND-IMAGE-PIN-V1-20260723.md` |
| Pack discipline | Still set **strong** `FM_LIVEKIT_*` + `WVP_*` in customer `.env` (lab fallbacks remain for bench only) |

**Was:** LiveKit `devkey`/`secret`, bare WVP passwords, `ingress:latest`.  
**Now:** env-driven + pinned ingress; verify `npm run verify:lab-creds`.

### B2 — Auth / ship gates (ops discipline)

| Item | Where | Risk |
|------|-------|------|
| `FM_TOTP_SUSPENDED` | Lab `.env` may be `1` | 2FA bypass on bench — **must be off for customer ship** (remind only at pack time) |
| Login factory hint | Gated — OK | Do not re-enable always-visible `global123` |

### B3 — Non-SIP ID generators

| Location | Status |
|----------|--------|
| fixed cams / conference shares / FR multer / command-wall owner | **APPLIED** — `MOB-APPLIED-SEC-NONSIP-ID-CRYPTO-RANDOM-V1-20260723.md` |

Verify: `npm run verify:nonsip-id`.

### B4 — Product UX / evidence (not crypto, but daily ops)

| Item | Disc | Risk |
|------|------|------|
| Redact Save → blank / leave → lost Finalize | `MOB-DISC-REDACT-FINISH-LOOP-NO-LOST-USER-20260722.md` | Operator loses redacted export path |
| **Recommended APPLY next (product):** `REDACT-FINISH-LOOP-HANDOFF-V1` | | |

### B5 — Network / expose posture (review)

| Item | Claim |
|------|-------|
| Fleet Valkey/Postgres bind | `127.0.0.1` in enterprise compose — good for lab host |
| WVP ZLM ports 80 / RTP ranges | Lab expose — firewall checklist exists; confirm customer site |
| Never use `172.17–172.31` as server IP | Locked rule — WSL/Docker bridge |

### B6 — Historical baselines

`baseline/**` may still contain `redis:7-alpine`. **Snapshots — do not “fix” unless restoring.** Active tree is under `docker/` + ship-pack LiveKit.

### B7 — WVP / third-party images (supply chain)

| Image | Tag | Note |
|-------|-----|------|
| `gemcjz/wvp-pro:latest` | floating | Lab |
| `zlmediakit/zlmediakit:master` | floating | Lab |
| LiveKit server/egress | pinned `v1.8.4` | Better |
| LiveKit ingress | `v1.8.4` | **Pinned** — `LAB-DEFAULT-CREDS-AND-IMAGE-PIN-V1` |

---

## C) Intentionally NOT security-hardened as “enterprise vault”

| Area | Reality |
|------|---------|
| Evidence files | On disk under `storage/` — access control = OS + dashboard auth + export perms |
| Redacted exports | Server-side `storage/evidence-exports/` — Download after Finalize |
| Valkey | Cache only — lose Valkey ≠ lose evidence |
| SQLite/JSON fallbacks | Still exist for degrade / lab paths where designed |

---

## D) What is NEXT after `ENTERPRISE-REDIS-IMAGE-LEGAL-PIN-V1`

Recommended order (agent pick — one MOB at a time):

| # | MOB | Why |
|---|-----|-----|
| **1** | `REDACT-FINISH-LOOP-HANDOFF-V1` | Operator pain now — blank/no Finalize/leave lost |
| **2** | `LAB-DEFAULT-CREDS-AND-IMAGE-PIN-V1` | Kill LiveKit/WVP default secrets + pin `ingress:latest` before any customer-facing pack |
| **3** | `SEC-NONSIP-ID-CRYPTO-RANDOM-V1` | **APPLIED** — remaining Math.random ID generators closed |
| **4** | Genre git push only when user says `lab-git-push-…` | Do not auto-push |

Do **not** park WVP handoff or turn off video base to “fix” security.

---

## E) Self-check double-pass (author agent)

| Check | Result 2026-07-22 |
|-------|-------------------|
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run verify` | PASS (includes valkey + redis-legal pin) |
| Active `docker/` `image: redis:7|8|latest` | None found |
| Fleet Valkey optional / degrade | Wired; health cache not 503 |
| SIP Call-ID crypto in live modules | APPLIED |
| Login rate LRU + trustProxy default off | APPLIED |
| Lab default passwords LiveKit/WVP | **STILL OPEN** |
| Redact finish loop UX | **STILL OPEN** (disc only) |
| TOTP suspended in lab | **Ship gate** — not fixed by this MOB |

---

## F) Files touched by ENTERPRISE-REDIS-IMAGE-LEGAL-PIN-V1 (for diff review)

- `docker/livekit.compose.yaml`
- `docker/wvp/docker-compose.wvp.yml`
- `docker/wvp/README-WVP-LAB.md`
- `ship-build-test/customer-pack/docker/livekit.compose.yaml`
- `docs/ME8-COMPOSE-LAYOUT.md`
- `docs/MOB-DISC-VALKEY-PURPOSE-AND-LEGAL-TIMEBOMB-20260722.md` (status line)
- `docs/MOB-APPLIED-ENTERPRISE-REDIS-IMAGE-LEGAL-PIN-V1-20260722.md`
- `scripts/verify-enterprise-redis-image-legal-pin.js`
- `package.json` (`verify` / `verify:redis-legal`)
- This handoff: `docs/MOB-DISC-THIRD-PARTY-SECURITY-HARDENING-HANDOFF-20260722.md`

---

## G) Reviewer response template

```
CONFIRMED:
- …

DISPUTED:
- … (evidence)

STILL OPEN / NEW FINDS:
- …

Recommended next MOB:
- …
```

Pass this whole file + `npm run verify` output to the third-party agent.
