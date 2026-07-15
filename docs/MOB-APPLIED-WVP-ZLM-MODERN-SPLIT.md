# MOB-APPLIED — mob-wvp-zlm-modern-split

**Date:** 2026-07-14  
**Status:** APPLIED (containers up; SIP + ZLM link proven; cams may re-register)

## What changed

Replaced fossil all-in-one Hub `648540858/wvp_pro` (ZLM Nov 2021) with a **split** lab stack:

| Service | Image | Container |
|---------|--------|-----------|
| WVP 2.7.3 | `gemcjz/wvp-pro:latest` | `me8-wvp` |
| Modern ZLM | `zlmediakit/zlmediakit:master` (build ~2026-07-13) | `me8-wvp-zlm` |
| DB | `postgres:15-alpine` + official 2.7.3 PG schema | `me8-wvp-db` |
| Redis | `redis:7-alpine` (pwd `root`) | `me8-wvp-redis` |

Fossil compose kept as `docker/wvp/docker-compose.wvp-fossil.yml` for emergency rollback only.

Fleet `me8-zlm` (:8080) and PTT SIP **5060** untouched. WVP SIP host remains **5061**.

## Key files

- `docker/wvp/docker-compose.wvp.yml` — modern split (primary for START-WVP-LAB)
- `docker/wvp/zlm-modern/config.ini` — modern ZLM (`mediaServerId=me8-zlm-modern`)
- `docker/wvp/wvp-config/application-modern.yml` — WVP wiring
- `docker/wvp/mysql-init/01-init-wvp2-pg.sql` — official PG schema
- `scripts/START-WVP-LAB.ps1` / `STOP-WVP-LAB.bat` / `docker/wvp/README-WVP-LAB.md`

## Lab facts (do not invent)

1. **Modern ZLM rejects the well-known default secret** `035c73f7-…` and regenerates a random one in memory. Lab secret is a unique value in `config.ini` + `application-modern.yml` (must match).
2. **SIP listen:** `sip.ip: <LAN>,0.0.0.0` — LAN bind fails inside Docker (logged), `0.0.0.0` succeeds. Host map **5061→5060**.
3. **Hooks:** `media.hook-ip: me8-wvp` so ZLM callbacks stay on Docker DNS (not `127.0.0.1`).
4. **Play ports:** host **80** / **18088** → modern ZLM HTTP (Track B). Fleet ZLM stays **8080**.
5. Platform defaults for cams: domain `4401020049`, id `44010200492000000001`, pwd `admin123`.

## Prove (operator)

1. `START-WVP-LAB.bat` (or stack already up).
2. UI: `http://192.168.1.38:18080` — login **admin** / **admin**.
3. Cams SIP → `192.168.1.38` port **5061** (may need short re-register after recreate).
4. Dashboard **Lab · WVP two tiles** → Play A + B → soak (next MOB: `mob-wvp-modern-soak`).

## Not in this MOB

- Stamp / Google latency knobs experiments (only on modern ini when you name a follow-up MOB)
- Claiming thousand-cam readiness
- Touching Firmware Gold / Open All / Fleet wall FFmpeg
