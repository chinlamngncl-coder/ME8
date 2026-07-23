# MOB-APPLIED — ENTERPRISE-REDIS-IMAGE-LEGAL-PIN-V1

**Date:** 2026-07-22  
**Status:** APPLIED (verify PASS)  
**Disc:** `MOB-DISC-VALKEY-PURPOSE-AND-LEGAL-TIMEBOMB-20260722.md`

## Intent

Remove floating Docker Hub `redis:7-alpine` from **active** compose (SSPL/RSAL/AGPL license time bomb).  
Use **Valkey 8 Alpine (BSD-3-Clause)** everywhere Fleet / LiveKit / WVP lab need a Redis-compatible cache.

## Changes

| File | Change |
|------|--------|
| `docker/livekit.compose.yaml` | `valkey/valkey:8-alpine`; DNS service name stays `redis` |
| `docker/wvp/docker-compose.wvp.yml` | Valkey + `valkey-server --requirepass root`; container `me8-wvp-redis` kept |
| `ship-build-test/customer-pack/docker/livekit.compose.yaml` | Same LiveKit pin |
| `docker/wvp/README-WVP-LAB.md` | Docs |
| `docs/ME8-COMPOSE-LAYOUT.md` | LiveKit Valkey note |
| `scripts/verify-enterprise-redis-image-legal-pin.js` | Gate — no `redis:7/8/latest` in active `docker/` |
| `package.json` | `verify:redis-legal` + included in `npm run verify` |

**Not changed:** `baseline/**` snapshots (historical). Fossil WVP all-in-one has no separate Redis service.

## Operator

If LiveKit or WVP lab is running, recreate those stacks so the new image is used:

```powershell
# LiveKit (if used)
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8\docker"
docker compose -f livekit.compose.yaml up -d --force-recreate

# WVP lab (if used)
.\STOP-WVP-LAB.bat
.\START-WVP-LAB.bat
```

Fleet enterprise Valkey was already Valkey — no change required unless recreating compose.

SOS / live / PTT / redact untouched.

## Verify

```powershell
npm run verify:redis-legal
npm run verify
```
