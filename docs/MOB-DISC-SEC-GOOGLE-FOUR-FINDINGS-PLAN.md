# MOB DISC — Security findings (Google list) vs our server — future patch plan

**Date:** 2026-07-15 ~01:28  
**Status:** **DISC ONLY** — no code until named `MOB-APPLY`  
**Tone:** Serious review; Google helpful but not gospel. Verified against `server.js`.  
**Do not** mix with live-chase / Seeta / wall tonight unless you open a **security genre**.

---

## Bottom line

| # | Google claim | Verified in tree? | Severity (honest) | Future MOB |
|---|--------------|-------------------|-------------------|------------|
| 1 | Multer path traversal via `originalname` | **Yes** — `filename: (_req, file, cb) => cb(null, file.originalname)` into `FTP_ROOT` | **Critical if token leaked / Insider** — still fix | `mob-sec-evidence-upload-safe-name` **P0** |
| 2 | Login Map unbounded → OOM | **Yes** — `_loginAttempts` Map + 5‑min sweep | **Medium** — real but oversold for typical single-IP; spoofed flood still possible | `mob-sec-login-rate-lru` **P1** |
| 3 | `uncaughtException` keeps process alive | **Yes** — log only, no `exit` | **High stability** — consensus is exit+restart; lab/Windows restart must be ready | `mob-sec-uncaught-exit` **P1** |
| 4 | SIP `Math.random` for call-id / SN / tag | **Yes** in **`server.js`** GB invite helpers (~9512–9805) | **Medium harden** — “session hijack” is stronger than usual for on-LAN GB; crypto still correct | `mob-sec-sip-crypto-random` **P1** |

Also nearby (Google missed / we note): FR multer filenames use `Math.random` **but** already sanitize; evidence upload is the dangerous one.

**Locked SIP core:** `lib/sipServer.js` / PTT — Google’s hits are in **`server.js`**, not that locked file. Still: one MOB, careful prove (Register/Invite/Open All untouched as regression gate).

---

## 1) Path traversal — evidence HTTPS upload

**Code (fact):**

```js
filename: (_req, file, cb) => cb(null, file.originalname),
destination: FTP_ROOT
```

**Mitigation already present:** Bearer `HTTPS_UPLOAD_TOKEN` required. Not anonymous internet write.

**Still a real bug:** anyone with the token (or a compromised docking agent) can send `../../…` style names and write **outside** intended evidence layout under how multer joins paths.

**Future fix (plan):**

- Store as `crypto.randomUUID() + ext` (ext from allowlist only), **or** `basename` + strip `..` + reject absolute paths.  
- Prefer **UUID + safe ext** (no user-controlled basename).  
- Keep original name in **metadata / registry** if ops need display name.  
- Mirror sanitization already used on FR enroll upload.

**PASS:** upload with `../../../evil.mp4` lands as UUID under `FTP_ROOT` only; auth still required.

---

## 2) Login rate-limit Map

**Code (fact):** Map keyed by `req.ip`; prune every 5 minutes if outside window.

**Google OOM story:** Possible under **many unique IPs** (botnet / IPv6 / X-Forwarded-For games if trust proxy mis-set). Unlikely in quiet lab with few NAT users. Still **bad pattern** for ship.

**Future fix (plan):**

- Cap Map size (e.g. max 5k–10k keys) drop oldest / LRU — **small pure JS** OK before adding `lru-cache` dep if we want fewer packages.  
- Or Redis later if multi-instance.  
- Re-check `trust proxy` so IP isn’t attacker-controlled header.

**PASS:** Map length stays under cap under synthetic unique-IP flood; real users still 429 after 10 tries.

---

## 3) uncaughtException keep-alive

**Code (fact):** logs `uncaughtException — process kept alive` and continues. Same for `unhandledRejection`.

**Why it was left:** avoid hard crash in early field life.  
**Why Google is right for security/stability:** corrupted state is worse than a clean restart.

**Future fix (plan):**

- Log → short sync flush if any → `process.exit(1)`.  
- Confirm **Windows service / Start.bat / NSSM / Docker** auto-restarts Fleet (operator desk prove).  
- Optionally gate: `FM_FATAL_EXIT=1` default on for ship builds; lab can leave soft if needed — **prefer one behavior**.

**PASS:** force throw once → process exits → manager brings Fleet back; no silent half-dead dashboard.

**Risk:** if no process manager, desk goes down until manual Start — document in ship checklist when APPLY.

---

## 4) SIP Math.random in server.js

**Code (fact):** several invite builders use `Math.random()` for `call-id`, From tag, SN.

**Honest threat model:** On closed LAN + device auth, predicting call-id alone rarely equals “take over BWC.” Still **wrong crypto class** for anything session-like; upgrade is cheap and correct.

**Future fix (plan):**

- `crypto.randomBytes` / `randomInt` / UUID-derived call-id strings.  
- **Only** the `server.js` blocks that Google flagged (and any twins in same file).  
- **Do not** casually edit Firmware Gold `lib/sipServer.js` / `pttServer.js` unless a second audit finds the same there **and** you name that file in APPLY.  
- Regression: one cam Invite, Open All, PTT word — operator eyes.

---

## Priority order (security genre — future)

When you open security work (after sleep / separate from FR align), **one APPLY at a time**:

| Order | MOB | Why first |
|-------|-----|-----------|
| **S0** | `mob-sec-evidence-upload-safe-name` | Clear CWE-22 class; token doesn’t excuse it |
| **S1** | `mob-sec-uncaught-exit` | Stability / integrity after prove restart path |
| **S2** | `mob-sec-sip-crypto-random` | Cheap harden; SIP prove careful |
| **S3** | `mob-sec-login-rate-lru` | Hygiene / anti-OOM |

Optional S4: unify FR multer to `randomUUID` instead of `Math.random` (low).

**Do not** bundle all four in one APPLY.  
**Do not** block soft-chase / Seeta wake on this list — schedule as **security genre**.

---

## What we reject from the paste

| Overclaim | Ours |
|-----------|------|
| “Immediately refactor” tonight | Disc only; APPLY later by name |
| Login Map will definitely OOM tomorrow | Possible under attack; not current lab symptom |
| Math.random SIP = instant stream hijack | Harden yes; drama down |
| Touch all SIP/PTT cores blindly | Only named files |

---

## One line

**Four issues are real enough to schedule (upload name = P0); plan named security MOBs for later — no patch until MOB-APPLY; don’t scare-merge into live video/FR work.**
