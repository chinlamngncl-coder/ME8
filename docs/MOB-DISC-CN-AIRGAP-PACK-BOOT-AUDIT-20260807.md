# MOB DISC — CN AirGap pack boot audit (why packs kept failing)

**Status:** DISC only — do **not** ship another zip until `MOB-APPLY` for the SIP-lib gap (and optional packer smoke gate)  
**Date:** 2026-08-07  
**Pack under audit:** `Mobility_Axiom_AirGapped_CN-20260807-0928.zip`  
**Method:** Path circle (`__dirname` = `ship-build/protected`) + real Docker compose + real `tools/node/node.exe ship-build/protected/run.js` on lab stage folder  

---

## Verdict (one line)

**0928 fixed yesterday’s fatal (`db/migrations` missing). It is still not a clean one-click pack:** SIP bridge child still dies (missing `lib/*` next to the proxy script). Lab retest also hit **stale Postgres volume password** and **port collisions** — those are environment traps, not zip holes, but Setup must not leave partners alone with them.

---

## Boot path (circle — keep linking)

```
Axiom_Enterprise_Setup.bat  (cwd = pack root)
  ├─ require ship-build/storage/license.lic          ✅ in 0928
  ├─ require ship-build/vendor/ffmpeg-lgpl/ffmpeg.exe ✅
  ├─ Set-DeployHostEnv → ship-build/protected/.env + root .env
  ├─ docker load vendor/docker-images/*.tar           ✅ 5 tars
  ├─ docker compose enterprise (Valkey + Postgres)    ✅ images present
  ├─ docker compose wvp (WVP+ZLM+wvp-db+redis)        ✅
  └─ node ship-build/protected/run.js
        __dirname === ship-build/protected   (esbuild bundle)
        ├─ dotenv: protected/.env                     ✅ written by Setup
        ├─ license: ../storage/license.lic            ✅ validateOnBoot OK (wildcard → 2036-08-06)
        ├─ ffmpeg: ../vendor/ffmpeg-lgpl/…            ✅
        ├─ catalog migrate: ../db/migrations/*.sql    ✅ 001–009 present; migrate ran (see note)
        ├─ gisOffline: ../data/gis/offline            ✅ 1973 PNG + Jiangsu bbox in presets
        └─ sipBridge({ appRoot: BASE_DIR=protected })
              → protected/scripts/wvp-sip-lan-proxy.js ✅ file exists
              → require('../lib/wvpSipLanMap')         ❌ MISSING in pack
```

---

## What I actually tested (not zip listing)

| Step | Result |
|------|--------|
| Stage path circle (license, ffmpeg, db 001/009, SIP script, GIS, node, compose, manual) | PASS except pre-Setup `.env` (expected) and optional `keys/license-public.pem` (OK — key embedded in `licenseVerifyKey`) |
| License `validateOnBoot` against packed `license.lic` | PASS (`trial_wildcard`, 20 BWC / 10 IPC, features on) |
| `docker compose` enterprise + wvp from stage | PASS (containers healthy) |
| Host PG auth with `.env` password on **old** volume | FAIL — volume password ≠ new `.env` (classic Postgres init-only-once) |
| Host PG auth after **volume reset** | PASS |
| Start packed `run.js` | Partial: ffmpeg OK, Valkey OK, migrate started, dashboard log line appeared, then lab **EADDRINUSE :5062/:6000/:29201** killed process; SIP child always **MODULE_NOT_FOUND** |

Migrations observed in DB after partial boot: versions **1–6** (crash interrupted before 7–9 finished on this noisy lab). On a clean port-free host, expect **1–9**.

---

## Still missing / broken in 0928

### P0 — must fix before next customer zip

1. **SIP proxy require graph not packed**  
   Script lives at `ship-build/protected/scripts/wvp-sip-lan-proxy.js` and does:
   - `require('../lib/wvpSipLanMap')`
   - `require('../lib/wvpLabClient')` → `fleetLog` → `siteTime`
   - `require('../lib/glassFortressLog')`  
   Reachable set from ME8 root (verified):  
   `lib/wvpSipLanMap.js`, `lib/wvpLabClient.js`, `lib/fleetLog.js`, `lib/siteTime.js`, `lib/glassFortressLog.js`  
   **None of these are under `ship-build/protected/lib/` in the pack.**  
   Symptom partner already saw as “SIP missing”; 0928 only put the **script** file, not the **deps**.

### P1 — one-click / reinstall traps (document + harden Setup)

2. **Stale Docker volume password**  
   If `mobility-enterprise_mobility_postgres_data` already exists from an older password, compose “succeeds” but app dies: `password authentication failed for user "mobility"`.  
   Partner on a virgin PC is fine; partner who retries install after `.env` password change is not.

3. **Ports already in use**  
   Lab had another Fleet on `:5062` / `:6000` / `:29201` / `:5060`. Pack process exits on uncaught `EADDRINUSE`. Clean PC OK; second install on same box without stop = fail.

### P2 — product / policy gaps (not today’s boot fatal)

4. **License opens FR / ANPR / weapon / VC; zip does not ship those engines**  
   Matches prior disc `MOB-DISC-PACK-LICENSED-ANALYTICS-ONECLICK-20260807.md`. Ops boot does not need them; claiming “all modules” without sidecars/LiveKit is dishonest for one-click.

5. **Jiangsu offline map**  
   Tiles **are** in pack (`ship-build/data/gis/offline`, ~1973 PNG). Bbox includes `cn-jiangsu` (Nanjing). UI injected zh + Nanjing center. Not “blank pack” — but coverage is metro bootstrap tiles, not full Jiangsu province Planetiler.

6. **`keys/license-public.pem` absent**  
   Not fatal — embedded verify key works (proven).

---

## Why we kept missing this (root cause of ~20 fails)

| Failure mode | Why agent/packer missed it |
|--------------|----------------------------|
| storage/vendor at wrong tree level (earlier packs) | Packed “looks complete” at zip root; runtime `__dirname` is `protected/` |
| `db/migrations` missing (2307) | Self-check never asserted migrate path; no boot smoke |
| SIP script “present” but child still dies (0928) | Self-check only `Test-Path` on the `.js` file — **never ran `node -e "require(…)"` / never walked require graph** |
| Postgres auth on retest | Lab volume pollution; host `psql` inside container lies (trust); need **host** TCP auth probe |
| “Zip entry OK = install OK” | Listing files ≠ listening on `:3888` |

**Rule going forward:** a CN pack is not done until a **boot smoke** on the staged folder (or extract of the zip) proves:

1. Host TCP `postgresql://…` from `.env` works (or Setup recreates volume)  
2. `run.js` reaches `dashboard listening` without fatal  
3. SIP child does **not** print `Cannot find module '../lib/…'`  
4. `schema_migrations` has versions **1–9**  
5. `GET /login.html` → 200  

---

## Proposed next APPLY (wait for user)

**Name:** `MOB-APPLY cn-pack-sip-lib-and-smoke`

1. Packer copies the 5 SIP-related `lib/*.js` files into `ship-build/protected/lib/` (and mirror under `ship-build/lib/` if desired).  
2. Self-check: `node -e "require('./ship-build/protected/scripts/wvp-sip-lan-proxy.js')"` must fail only on bind, not MODULE_NOT_FOUND — or static require-graph assert.  
3. Optional: Setup warns / offers recreate of `mobility-enterprise_mobility_postgres_data` when catalog auth fails.  
4. Rebuild zip; re-run this boot audit on a port-free machine (or stop lab Fleet first).  
5. Separately decide analytics/VC pack policy (align license flags or strip features from trial license).

**Do not** tell partner “0928 is final” until P0 is fixed and smoke passes.

---

## Clean partner install (after P0 fix)

1. Unzip full folder  
2. Docker Desktop running  
3. No other Mobility on 3888/5060/5062/6000/29201  
4. No leftover Postgres volume with different password (or first-time PC)  
5. `Axiom_Enterprise_Setup.bat` → real LAN IP (not 172.17–31)  
6. `http://LAN:3888` → `global` / `global123`

---

**Ubitron · Mobility Axiom** — CN AirGap pack boot audit disc  
