# 07 — Degrade tests & Postgres re-sync (Google Topic A follow-up)

**Context:** Google agreed Redis + Postgres **before ship**, but flagged **split-brain** if Postgres fails and the app silently writes SQLite, then merges ad hoc.

**Mobility response:** Accept the risk. Revise enterprise pack to **three explicit modes** — not silent dual-primary writes.

---

## 1. Revised runtime modes

| Mode | When | Catalog writes | GPS / online cache | SOS / live / PTT |
|------|------|----------------|--------------------|------------------|
| **NORMAL** | Valkey + Postgres healthy | Postgres primary | Valkey + memory + JSON shadow | Unchanged |
| **CACHE_DEGRADED** | Valkey down | Postgres (unchanged) | Memory + JSON only (`last-gps.json`) | Unchanged |
| **CATALOG_DEGRADED** | Postgres down | **Queue only** — see §2 | Valkey or JSON | **Unchanged — never blocked** |

**Enterprise install default:** `FM_CATALOG_MODE=postgres_required` — Mobility **refuses catalog writes** in CATALOG_DEGRADED unless operator sets `FM_CATALOG_ALLOW_SQLITE_QUEUE=1`.

**Lab / single-VM without HA:** queue + replay (§2) — must pass tests in §4 before ship.

---

## 2. Split-brain fix — catalog sync queue (not silent dual-write)

When Postgres is unavailable and queue mode is enabled:

1. **Do not** write new evidence/BWC rows only to SQLite while also reading Postgres elsewhere.
2. **Do** append to `storage/catalog-sync-wal.jsonl` (one JSON line per mutation):

```json
{"op":"upsert","table":"evidence_files","id":"…","row":{…},"ts":"2026-06-27T12:00:00.000Z","seq":1042}
```

3. Mirror the same row into SQLite with `pg_sync_state = 'pending'` (column on affected tables).
4. On Postgres recovery, run **replay** (`lib/catalogPgReplay.js`):
   - Process WAL in `seq` order
   - `INSERT … ON CONFLICT (id) DO UPDATE` where `excluded.updated_at > existing.updated_at`
   - Mark SQLite row `pg_sync_state = 'synced'`
   - Truncate WAL entries only after PG commit ACK

**Idempotency key:** natural primary keys (`deviceId`, evidence `id`) + monotonic `updated_at` / `seq`.

**Conflict rule:** Postgres wins if `updated_at` newer; if tie, higher `seq` wins; log collision to `storage/catalog-sync-conflicts.log` for audit.

---

## 3. Redis / Valkey degrade (lower risk — Google did not object)

GPS and online flags are **eventually consistent**. Fallback:

| Layer | Order on read (boot) |
|-------|----------------------|
| Memory | Live process |
| Valkey | If `FM_REDIS_URL` set |
| JSON file | `last-gps.json`, `contact-cache.json` |

**Merge rule:** per `camId`, keep fix with **newest `ts`**.

No split-brain for ops: worst case stale map pin until next GPS fix — acceptable for degrade test pass.

---

## 4. Degrade test matrix (required before `trial-gold-2.0-enterprise`)

Run on staging VM. Log template: `storage/degrade-test-YYYYMMDD.log`.

### 4.1 Baseline — NORMAL

| # | Step | Expected | Pass |
|---|------|----------|------|
| N1 | Valkey + Postgres up, `VERIFY` OK | App starts | ☐ |
| N2 | BWC GPS update | Row in Valkey + JSON; map updates | ☐ |
| N3 | Dock FTP → evidence index | Row in Postgres + SQLite `synced` | ☐ |
| N4 | Cold SOS + live wall panel | Pass (inherited v1.9) | ☐ |

### 4.2 CACHE_DEGRADED — stop Valkey only

| # | Step | Expected | Pass |
|---|------|----------|------|
| R1 | `docker stop valkey` (or compose service) | App stays up; log `cache_degraded` | ☐ |
| R2 | GPS update for cam A | Memory + `last-gps.json` updated; map OK | ☐ |
| R3 | Camera WS connect/disconnect | Online state in memory; dashboard roster OK | ☐ |
| R4 | 15 min soak | No crash; SOS/live smoke | ☐ |
| R5 | Start Valkey | Hydrate merges by newest `ts`; no duplicate pins | ☐ |

### 4.3 CATALOG_DEGRADED — stop Postgres only (`postgres_required`)

| # | Step | Expected | Pass |
|---|------|----------|------|
| P1 | Stop Postgres | App stays up; `/api/platform/status` shows `catalogDegraded: true` | ☐ |
| P2 | Attempt evidence catalog write | **HTTP 503** or queued per policy — **not silent SQLite-only** | ☐ |
| P3 | SOS + live + PTT | **Must pass** — catalog down does not block | ☐ |
| P4 | FTP dock upload | File on disk; index queued or deferred with operator message | ☐ |

### 4.4 CATALOG_DEGRADED — queue mode (`FM_CATALOG_ALLOW_SQLITE_QUEUE=1`)

| # | Step | Expected | Pass |
|---|------|----------|------|
| Q1 | Postgres down | Queue mode active | ☐ |
| Q2 | Dock FTP → index | WAL line + SQLite `pending`; dashboard shows pending badge | ☐ |
| Q3 | BWC registry edit | Same queue path | ☐ |
| Q4 | Start Postgres | Auto replay within 60 s OR manual `POST /api/storage/catalog-replay` | ☐ |
| Q5 | Row parity | Postgres row count ≥ SQLite synced; no duplicate evidence IDs | ☐ |
| Q6 | WAL drained | `catalog-sync-wal.jsonl` empty or rotated | ☐ |

### 4.5 BOTH down

| # | Step | Expected | Pass |
|---|------|----------|------|
| B1 | Valkey + Postgres stopped | CACHE_DEGRADED + CATALOG_DEGRADED | ☐ |
| B2 | Full smoke §N4 | SOS/live/PTT/map GPS from JSON | ☐ |
| B3 | Restore both | NORMAL within 5 min; replay if queue used | ☐ |

### 4.6 Postgres HA (Google recommendation — deployment test)

| # | Step | Expected | Pass |
|---|------|----------|------|
| H1 | Compose with Postgres primary + replica (or managed HA) | Document in enterprise kit | ☐ |
| H2 | Kill primary; promote replica / failover | Mobility reconnects; **no SQLite queue writes** in HA profile | ☐ |
| H3 | Catalog write during failover window | Retry or brief 503 — no split-brain | ☐ |

---

## 5. New MOBs (add to Wave 3 in doc 03)

| MOB ID | Purpose |
|--------|---------|
| `mob-pg-sync-wal` | Append-only WAL + `pg_sync_state` columns |
| `mob-pg-resync-replay` | Idempotent replay on PG recovery |
| `mob-pg-degraded-policy` | `FM_CATALOG_MODE`, 503 vs queue |
| `mob-catalog-replay-api` | Tech admin trigger + status endpoint |

---

## 6. Question back to Google (optional)

> We revised Postgres fallback to **queue + ordered replay** (or **postgres_required** with HA compose). Does this address split-brain, or do you require **no SQLite catalog writes at all** in enterprise v1?

**Google (record here):**

```
```

---

*MOB DISC — implementation when user says MOB-APPLY per MOB ID.*
