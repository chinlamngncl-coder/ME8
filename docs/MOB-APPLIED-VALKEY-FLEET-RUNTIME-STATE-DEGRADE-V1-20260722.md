# MOB-APPLIED — VALKEY-FLEET-RUNTIME-STATE-DEGRADE-V1

**Date:** 2026-07-22  
**Status:** APPLIED (lab verify PASS; operator smoke pending)

## Intent

Optional Valkey runtime cache for Fleet GPS / online / SIP contact with **degrade-safe** dual-write.  
Valkey down or `FM_REDIS_URL` unset → memory + JSON (`last-gps.json`, `last-sip-contact.json`).  
**Never** blocks SOS / live / PTT. Health `cache` is informational only (no 503 from cache alone).

## Changes

| Area | What |
|------|------|
| `lib/redisRuntime.js` | Connect / noop / degrade; dual-write + hydrate by newest `at` |
| `server.js` | Wire client; GPS/contact/online dual-write; boot hydrate; `/api/health` → `cache` |
| `lib/enterpriseEnv.js` | `wired: true`, `redisRuntime: true` |
| `docker/docker-compose.enterprise.yml` | Restore Valkey `127.0.0.1:6379` + existing Postgres |
| `.env.enterprise.example` | `FM_REDIS_URL` + catalog block |
| `ioredis` | Production dependency (MIT) |
| Legal notices | Valkey + ioredis |
| `scripts/verify-valkey-fleet-runtime-state-degrade.js` | Unit + wiring gates |

## Operator steps

1. *(Optional)* Start Valkey:  
   `docker compose -f docker/docker-compose.enterprise.yml up -d valkey`
2. *(Optional)* In `.env`: `FM_REDIS_URL=redis://127.0.0.1:6379`  
   Leave unset to keep today’s memory+JSON-only behaviour.
3. `.\RESTART-FLEET.bat`
4. Hard refresh dashboard once.
5. Smoke: cold SOS, live wall, PTT — must work with Valkey **up or down**.

## Degrade drill

```powershell
docker stop mobility-valkey
# Fleet stays up; /api/health shows cache.mode=degraded (ok still true if SOS/SIP/PTT healthy)
docker start mobility-valkey
```

## Verify (agent)

```powershell
npm run verify:valkey
npm run verify
```

## Out of scope

- LiveKit’s internal Redis (separate compose) — do not replace  
- Making Valkey required for ship  
- Postgres catalog changes
