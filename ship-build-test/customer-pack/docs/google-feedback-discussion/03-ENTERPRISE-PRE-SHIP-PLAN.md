# 03 — Enterprise pre-ship plan (what / how / MOB order)

> **ME8:** Apply all MOBs on `Enterprise Mobility\ME8`. Ship lock = **`me8-v1`**. See [../ME8-ROADMAP.md](../ME8-ROADMAP.md).

**Goal:** Ship **enterprise-grade** software — not “Phase B empty boxes later.”  
**Constraint:** Trial `SaaS Mobility` stays restorable until **`me8-v1`** passes VERIFY + review gate on **ME8**.  
**8 BWC:** In scope on ME8 (seeded from `Lab-8BWC-v2` / `8wc-v2`).

---

## What “enterprise pre-ship” means (customer-facing)

| Capability | Ship promise |
|------------|--------------|
| **Single site node** (on-prem or VPS) | Yes — primary SKU |
| **Valkey-backed runtime cache** (GPS, online, contact) | Yes — memory + JSON fallback if Valkey down |
| **PostgreSQL catalog** (evidence metadata, BWC registry) | Yes — **primary**; queue+replay or HA — **not silent SQLite dual-write** |
| **Stability hardening** (debounce, async hot writes, fatal policy) | Yes |
| **Enterprise install kit** (Docker Compose: Redis + Postgres + Mobility) | Yes |
| **FTP** | LAN-segmented FTP:21 (BWC protocol) — not SFTP unless device supports |
| **Multi-tenant SaaS portal** | No — post ship |
| **SIP farm / NLB media cluster** | No — documented roadmap |
| **8 concurrent live wall** | Yes — ME8 product (from lab seed) |

---

## Architecture after pack (single node, enterprise-ready)

```
┌─────────────────────────────────────────────────────────────┐
│  Mobility server.js (monolith — SIP/ffmpeg/WS unchanged)   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ SIP / PTT   │  │ liveStream   │  │ Dashboard HTTP   │  │
│  │ GPS ingest  │  │ Pool ffmpeg  │  │ Socket.IO        │  │
│  └──────┬──────┘  └──────────────┘  └────────┬─────────┘  │
│         │ dual-write (feature flag)            │            │
└─────────┼──────────────────────────────────────┼────────────┘
          ▼                                      ▼
   ┌──────────────┐                    ┌─────────────────┐
   │ Valkey       │                    │ PostgreSQL       │
   │ gps, online, │                    │ evidence catalog │
   │ contact      │                    │ bwc_devices, audit│
   └──────────────┘                    └─────────────────┘
          │ CACHE_DEGRADED                     │ CATALOG_DEGRADED
          ▼                                      ▼
   last-gps.json                         queue WAL + replay
   contact-cache.json                   (or HA failover — no queue)
                                         mobility.db = shadow only
```

**Rules (Google-aligned):**

- **SOS / live / PTT** — never blocked by Valkey or Postgres.
- **Valkey down** — memory + JSON; merge by newest `ts` on recovery ([07](./07-DEGRADE-TESTS-AND-PG-RESYNC.md) §3).
- **Postgres down** — **no silent split-brain**; `postgres_required` (503) or **queue + WAL replay** ([07](./07-DEGRADE-TESTS-AND-PG-RESYNC.md) §2).

---

## Implementation — MOB sequence (one MOB-APPLY at a time)

### Wave 0 — Foundation (no app logic)

| MOB ID | Work | Files | Risk |
|--------|------|-------|------|
| `mob-enterprise-compose` | `docker/docker-compose.enterprise.yml` — **Valkey** + Postgres 16 + healthchecks | `docker/*` | None |
| `mob-env-enterprise` | `.env.example` — `FM_REDIS_URL`, `FM_CATALOG_DB_URL`, `FM_CATALOG_MODE`, queue flags | `.env.example` | None |

### Wave 1 — Stability (v1.9-compatible)

| MOB ID | Work | Files | Risk |
|--------|------|-------|------|
| `mob-stability-debounce-default` | Document + ship profile: `FM_USE_CACHE_DEBOUNCE=1` | docs, deployment manual | Very low |
| `mob-stability-async-cache` | `fs.promises` for GPS/contact save; keep debounce | `server.js`, `lib/scalePrep.js` | Low |
| `mob-stability-fatal-policy` | Media/SIP paths: log + metric + optional controlled exit; dashboard paths: keep soft | `server.js` | Medium — full smoke |

### Wave 2 — Valkey layer

| MOB ID | Work | Files | Risk |
|--------|------|-------|------|
| `mob-redis-client` | `lib/redisRuntime.js` — Valkey connect, noop if URL empty | new lib | Low |
| `mob-redis-gps-dualwrite` | On GPS update: memory + JSON + Valkey HSET + `ts` | `server.js` | Medium |
| `mob-redis-online-dualwrite` | Mirror `activeCameraSockets` registration | `server.js` | Medium |
| `mob-redis-contact-dualwrite` | Mirror SIP contact cache | `server.js` | Medium |
| `mob-redis-read-hydrate` | On boot: merge Valkey + JSON by newest `ts` | `server.js` | Medium |

### Wave 3 — PostgreSQL catalog (Google split-brain revision)

| MOB ID | Work | Files | Risk |
|--------|------|-------|------|
| `mob-pg-adapter` | `lib/catalogPg.js` — pool, same tables as `siteDb.js` | new lib | Medium |
| `mob-pg-schema-migrate` | Idempotent schema + `pg_sync_state` | SQL / script | Medium |
| `mob-pg-degraded-policy` | `FM_CATALOG_MODE=postgres_required` vs queue mode | `lib/siteDb.js`, `server.js` | Medium |
| `mob-pg-sync-wal` | Append-only `catalog-sync-wal.jsonl` on PG outage | new lib | **High** |
| `mob-pg-resync-replay` | Idempotent UPSERT replay on PG recovery | `lib/catalogPgReplay.js` | **High** |
| `mob-catalog-replay-api` | Tech status + manual replay trigger | `server.js` | Medium |
| `mob-pg-read-prefer` | When PG healthy: read PG; SQLite shadow for migrate only | `lib/siteDb.js` | High |

See [07-DEGRADE-TESTS-AND-PG-RESYNC.md](./07-DEGRADE-TESTS-AND-PG-RESYNC.md).

### Wave 4 — Security & hygiene

| MOB ID | Work | Files | Risk |
|--------|------|-------|------|
| `mob-ftp-bind-lan` | FTP listen bind + docs (WAN firewall) | `lib/ftpIngest.js`, docs | Low |
| `mob-ignore-cam-ids-env` | `FM_IGNORE_CAM_IDS` replaces hardcoded HQ | `server.js`, rosters | Low |
| `mob-archive-s3-optional` | S3/MinIO upload path for evidence archive (flag) | `lib/storagePaths.js` | Medium |

### Wave 5 — Lock & certify

| MOB ID | Work | Files | Risk |
|--------|------|-------|------|
| `mob-firmware-lock-2.0-enterprise` | CREATE-TRIAL-GOLD + VERIFY + `BASELINE-TRIAL-GOLD.md` → v2.0 | baseline | None |
| `mob-enterprise-soak-doc` | 24h soak checklist results template | doc 05 | None |

**Do not bundle waves.** After any Wave 2–3 MOB: cold SOS + live wall + PTT smoke.

---

## New libraries (planned)

| Module | Responsibility |
|--------|----------------|
| `lib/redisRuntime.js` | Connection, dual-write helpers, graceful degrade |
| `lib/catalogPg.js` | Postgres pool, CRUD parity with `siteDb.js` |
| `docker/docker-compose.enterprise.yml` | Redis + Postgres for customer install |

**Dependencies (add at Wave 2/3):** `ioredis` or `redis`, `pg` — pin versions in `package.json`.

---

## Testing strategy (before ship)

| Stage | Test |
|-------|------|
| After each MOB | `VERIFY-TRIAL-GOLD` if no baseline change; else partial smoke |
| After Wave 1 | 15 min — map GPS, live panel, PTT |
| After Wave 2 | Redis up/down — app works with Redis stopped |
| After Wave 3 | Row count parity SQLite vs Postgres; dock FTP index |
| Before lock | [05-REVIEW-GATE-BEFORE-SHIP.md](./05-REVIEW-GATE-BEFORE-SHIP.md) |
| Optional scale | `SCALE-READINESS-CERTIFICATE.md` on staging VM |

---

## Timeline estimate (human + MOB discipline)

| Wave | Calendar (focused) |
|------|-------------------|
| 0–1 | 2–4 days |
| 2 | 3–5 days |
| 3 | 5–8 days |
| 4 | 2–3 days |
| 5 + external review | 2–3 days |

**Total:** ~3–4 weeks careful work vs 1 week reckless big-bang.

---

## What we will NOT do before ship (even for “enterprise”)

1. Retire SQLite/JSON with **no fallback**
2. Multi-tenant RLS Postgres
3. Split `mobility-api` / `mobility-media` processes
4. NLB in front of SIP/RTP
5. 8 BWC concurrent cap changes
6. Touch locked files (`video-wall.js`, `fleet-ui.js`, `ptt-rx.js`, `pttServer.js`) unless explicit MOB + full verify

---

## Firmware progression

```
trial-gold-1.9          → ship anchor (Settings + inherited live/SOS/PTT)
        ↓ MOBs Wave 0–4
trial-gold-2.0-enterprise → enterprise pack + VERIFY + Google/Claude gate
        ↓ later, separate folder
trial-gold-8bwc-*       → 8 BWC program only
```

---

## AI execution rules (for implementation)

1. User says **`MOB-APPLY <mob-id>`** — one ID per session.
2. Regression in VC/PTT/SOS/wall/pin → user says **`RUN RESTORE-TRIAL-GOLD`** (v1.9 until 2.0 locked).
3. Every Wave 2–3 MOB includes **degrade path** test in PR notes.
4. After 2.0 lock, default restore becomes 2.0 — archive 1.9 first.
