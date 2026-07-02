# 01 — Google diagnostic summary (verified against codebase)

**Date:** 2026-06-27  
**Code tree:** `C:\Users\user\Desktop\Enterprise Mobility\SaaS Mobility`  
**Firmware at analysis:** `trial-gold-1.9` (164 files)

---

## Google’s original prompt (three themes)

### 1. Stability — crash resistance & blocking

- `uncaughtException` / `unhandledRejection` handlers keep the process alive.
- Heavy use of synchronous FS (`readFileSync`, `writeFileSync`) on volatile data (GPS cache).
- **Ask:** Refactor to avoid memory leaks, undefined state, event-loop blocking under camera load.

### 2. Scalability — state management

- `activeCameraSockets`, `lastGpsByCam`, SIP contacts in memory / local JSON.
- Single Node process → no horizontal scale behind a load balancer.
- **Ask:** Step-by-step externalize state (Redis ephemeral, PostgreSQL persistent).

### 3. Security

- Plaintext FTP for snapshot / ingest.
- Hardcoded identifiers (e.g. `HQ_CAM_ID = '10A01000822E82BFC00'`).
- **Ask:** Practical secure alternatives (SFTP, S3-compatible storage, secrets management).

---

## What we found in the repo (facts)

| Finding | Location | Notes |
|---------|----------|-------|
| Fatal error swallow | `server.js` ~35–54 | Logs + continues |
| GPS sync write | `server.js` `saveGpsCacheSync` | Debounce in `lib/scalePrep.js` — **off unless** `FM_USE_CACHE_DEBOUNCE=1` |
| Contact sync write | `server.js` `saveContactCacheSync` | Same debounce path |
| Camera WS map | `server.js` `activeCameraSockets` | In-process only |
| GPS runtime | `lastGpsByCam` + `storage/last-gps.json` | Load on boot, save on update |
| FTP server | `lib/ftpIngest.js` | `ftp-srv`, port 21 — BWC vendor pattern |
| HQ cam filter | `server.js` `HQ_CAM_ID` | Excluded from `isBwcCameraId()` — SDK manual ID, not production fleet |
| Production fleet | `storage/bwc-devices.json`, `mobility.db` | Via `lib/bwcDevices.js`, `lib/siteDb.js` |
| Catalog DB today | SQLite WAL | `storage/mobility.db` — evidence metadata, not video blobs |
| Cloud roadmap | `docs/CLOUD-PROGRAM.md` | Phases A–E already documented |
| Postgres placeholder | `.env.example` `FM_CATALOG_DB_URL` | Not wired in V2 |

---

## Related internal docs

- [CLOUD-PROGRAM.md](../CLOUD-PROGRAM.md)
- [STORAGE-DATABASE.md](../STORAGE-DATABASE.md)
- [SCALE-READINESS-CERTIFICATE.md](../SCALE-READINESS-CERTIFICATE.md)
- [BASELINE-TRIAL-GOLD.md](../../BASELINE-TRIAL-GOLD.md)
