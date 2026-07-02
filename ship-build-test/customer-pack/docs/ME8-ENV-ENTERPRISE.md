# ME8 enterprise environment profile

**MOB:** `mob-env-enterprise` (Phase B Wave 0)  
**Wiring:** Env parse only — Fleet **does not connect** to Valkey/Postgres until `mob-redis-client` / `mob-pg-adapter`.

---

## Files

| File | Use |
|------|-----|
| [`.env.enterprise.example`](../.env.enterprise.example) | Enterprise overlay — copy into `.env` |
| [`.env.me8.example`](../.env.me8.example) | Full ME8 ship template (includes commented enterprise block) |
| [`lib/enterpriseEnv.js`](../lib/enterpriseEnv.js) | Parser + validator for future MOBs |
| [`docker/docker-compose.enterprise.yml`](../docker/docker-compose.enterprise.yml) | Valkey + Postgres containers |

---

## Quick start (lab)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
docker compose -f docker/docker-compose.enterprise.yml up -d
# Append enterprise vars to .env (edit passwords for production):
#   copy from .env.enterprise.example
node scripts/test-enterprise-env.js
.\RESTART-FLEET.bat   # Fleet still uses JSON/SQLite until Wave 2–3 MOBs
```

Compose smoke: `.\SMOKE-COMPOSE.ps1 -LeaveRunning`

---

## Variables

### Valkey (cache)

| Variable | Default | Meaning |
|----------|---------|---------|
| `FM_REDIS_URL` | *(unset)* | `redis://127.0.0.1:6379` — matches `mobility-valkey` compose service |
| `FM_REDIS_CONNECT_TIMEOUT_MS` | `5000` | Connect timeout when wired |
| `FM_REDIS_KEY_PREFIX` | `me8:` | Key namespace prefix |

**Unset** = no Valkey layer (today’s behaviour). SOS/live/PTT never depend on Valkey (doc 07).

### PostgreSQL (catalog)

| Variable | Default | Meaning |
|----------|---------|---------|
| `FM_CATALOG_DB_URL` | *(unset)* | `postgresql://mobility:PASSWORD@127.0.0.1:5432/mobility` |
| `FM_CATALOG_MODE` | `off` | `postgres_required` \| `sqlite_shadow` \| `off` |
| `FM_CATALOG_ALLOW_SQLITE_QUEUE` | `0` | `1` = WAL queue when PG down (lab); `0` = 503 (ship) |
| `FM_CATALOG_WAL_PATH` | `storage/catalog-sync-wal.jsonl` | Queue file when queue mode enabled |

**Ship profile:** `FM_CATALOG_MODE=postgres_required`, `FM_CATALOG_ALLOW_SQLITE_QUEUE=0`.

**Lab without HA:** set `FM_CATALOG_ALLOW_SQLITE_QUEUE=1` and run degrade tests in [07-DEGRADE-TESTS-AND-PG-RESYNC.md](./google-feedback-discussion/07-DEGRADE-TESTS-AND-PG-RESYNC.md).

### Stability (Wave 1 — ME8 ship default)

| Variable | ME8 ship | Meaning |
|----------|----------|---------|
| `FM_USE_CACHE_DEBOUNCE` | **`1`** | Debounce GPS/contact disk writes |
| `FM_GPS_CACHE_DEBOUNCE_MS` | `2000` | GPS cache flush interval |
| `FM_CONTACT_CACHE_DEBOUNCE_MS` | `2000` | SIP contact cache flush interval |

Detail: [ME8-STABILITY-DEBOUNCE.md](./ME8-STABILITY-DEBOUNCE.md). Set `FM_USE_CACHE_DEBOUNCE=0` for lab legacy sync only.

---

## Profiles

| Profile | Redis URL | Catalog mode | Queue | When |
|---------|-----------|--------------|-------|------|
| **Lab bench (today)** | unset | `off` | `0` | Default — no Docker required |
| **Enterprise dev** | set | `sqlite_shadow` | `0` | Docker up; testing env parse |
| **Enterprise ship** | set | `postgres_required` | `0` | Customer + HA Postgres |
| **Single-VM queue lab** | set | `postgres_required` | `1` | Degrade test §4.4 |

---

## Validation

```powershell
node scripts/test-enterprise-env.js
node scripts/test-enterprise-env.js --env .env
```

Checks URL shapes, `FM_CATALOG_MODE` enum, and `postgres_required` requires `FM_CATALOG_DB_URL`.

---

## Next MOBs

| MOB | What |
|-----|------|
| `mob-redis-client` | Connect when `FM_REDIS_URL` set |
| `mob-pg-adapter` | Connect when `FM_CATALOG_DB_URL` set |
| `mob-stability-debounce-default` | Ship profile for debounce flags |

See [ME8-ROADMAP.md](./ME8-ROADMAP.md) Phase B.
