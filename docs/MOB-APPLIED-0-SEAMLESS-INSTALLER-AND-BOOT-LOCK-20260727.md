# MOB-APPLIED 0-SEAMLESS-INSTALLER-AND-BOOT-LOCK (2026-07-27)

## Goal

Cross-platform 1-Pack entry with Setup boot-lock, `.env` ACL, HTTPS + localhost HTTP escape, firewall helper, CLI recovery, and orphan child kill hooks.

**Lab unchanged:** keep using `node server.js`. 1-Pack uses `node bin/me8-server.js` / `npm run start:1pack`.

---

## Analysis (STEP 0 agent instruction)

### Unhandled exceptions
- Setup path wraps boot in `main().catch` → `process.exit(1)`.
- Full stack keeps existing `installFatalProcessPolicy` (uncaught / unhandledRejection).
- Firewall / `.env` ACL failures are **warn-only** — never abort boot.
- License upload validates before keeping file; bad upload deleted.
- **Port fallback patch:** when Setup port hits `EACCES` / `EADDRINUSE`, TTY asks for a new port; background service exits with `[FATAL] Port X is locked`.

### Browser SSL lockouts
- Setup serves **HTTP on `SETUP_PORT` (default 13988) bound to `127.0.0.1` only** — local physical access without cert prompt.
- Optional **HTTPS on `SETUP_HTTPS_PORT` (default 13989)** via existing self-signed ensure script.
- **Must not** reuse lab `FM_HTTP_PORT` (often **3988**) — that collision caused `EACCES` / listen fail.
- Middleware `localhostHttpGate`: if a dual-stack listener ever sees non-TLS from non-loopback → **403**.
- Full Fleet under `FM_SEAMLESS_PACK=1` + `FM_HTTPS_ENABLED=1` also applies the gate.

### CLI recovery
| Flag | Effect |
|------|--------|
| `--reset-license` | Deletes `storage/license.lic`, root `license.lic`, `storage/platform-license.json` → Setup UI |
| `--safe-mode` | Setup UI only (no Video / DB / Analytics) |
| (default, boot-lock on, no license) | Same as safe Setup UI |
| (license OK) | `require('server.js')` full stack |

---

## Build script config

- `scripts/build-1pack.js` — pkg → `dist/windows-x64/me8-server.exe`, `dist/linux-x64/me8-server`
- `scripts/pkg-1pack.json` — assets (`setup-boot.html`, TLS helper, `lib/**`, public key)
- External **`plugins/`** directory beside binary (C++ AI binaries **not** packed into exe)
- Requires: `npm i -D @yao-pkg/pkg` then `npm run build:1pack`

**Note:** Heavy native modules (`node-llama-cpp`, etc.) are **not** claimed as fully pkg-safe in V1 — ship them under `plugins/` or use the existing Node+`run.js` ship pack for full media. 1-Pack V1 focuses on boot lock + Setup + recovery.

---

## Boot logic (entry)

```text
bin/me8-server.js
  → dotenv
  → FM_SEAMLESS_PACK=1, SETUP_PORT, BOOT_LOCK, AIRGAP required (defaults)
  → installOrphanHooks()
  → lockEnvFile(.env)   // chmod 600 / icacls — no variable strip
  → applyFirewallIngress()  // UDP 10000-20000; SETUP_PORT localhost-only (best-effort)
  → --reset-license? clear licenses
  → needsSetupOnly? → startSetupWithPortFallback()
       → lib/setupOnlyServer.js
       → on blocked port: prompt + safe mutate only SETUP_PORT= in .env + re-run firewall helper + retry
  → else require(server.js)
```

---

## Files

| Path | Role |
|------|------|
| `bin/me8-server.js` | 1-Pack entry |
| `lib/seamlessCli.js` | argv |
| `lib/envFileAcl.js` | `.env` ACL |
| `lib/firewallIngress.js` | Defender / ufw |
| `lib/processGroupHooks.js` | child track + kill |
| `lib/localhostHttpGate.js` | HTTP localhost-only |
| `lib/setupOnlyServer.js` | Setup-only listeners |
| `public/setup-boot.html` | License upload UI |
| `scripts/build-1pack.js` | pkg build |
| `scripts/pkg-1pack.json` | pkg assets |

---

## Operator check

1. `node bin/me8-server.js --help`
2. Double-click `LAB-1PACK-SAFE-MODE.bat` **or** `node bin/me8-server.js --safe-mode` → open `http://127.0.0.1:13988`
3. `node bin/me8-server.js --reset-license` → licenses removed, Setup UI
4. Lab: `LAB-CONSOLE-START.bat` / `node server.js` still on **:3988** (unchanged)

## Verify

```bash
node scripts/verify-0-seamless-installer-and-boot-lock.js
```
