# ME8 stability — cache debounce + async writes (Wave 1)

**MOBs:** `mob-stability-debounce-default`, `mob-stability-async-cache`  
**Code:** `lib/scalePrep.js` (debounce + async writer), `server.js` (GPS/contact flush)

---

## Ship default

ME8 fresh installs enable debounced disk writes for hot paths:

| Variable | ME8 value | Effect |
|----------|-----------|--------|
| `FM_USE_CACHE_DEBOUNCE` | `1` | Enable debounce layer |
| `FM_GPS_CACHE_DEBOUNCE_MS` | `2000` | Batch `last-gps.json` writes |
| `FM_CONTACT_CACHE_DEBOUNCE_MS` | `2000` | Batch SIP contact cache writes |

Set in [`.env.me8.example`](../.env.me8.example) and [`.env.enterprise.example`](../.env.enterprise.example).

`NEW-ME8-INSTALL.ps1` appends these lines if missing from an existing `.env`.

---

## Behaviour

| Mode | GPS / contact save |
|------|-------------------|
| `FM_USE_CACHE_DEBOUNCE=0` | Every fix writes disk immediately (legacy, async `fs.promises`) |
| `FM_USE_CACHE_DEBOUNCE=1` | Coalesce writes within the debounce window; flush uses `fs.promises` (non-blocking) |

**Shutdown:** `SIGINT` / `SIGTERM` cancel pending debounce timers and perform a final **sync** write from in-memory state so the process can exit without awaiting I/O.

**Not debounced:** in-memory map state, Socket.IO emits, SOS/live/PTT paths.

Optional (still off in ME8 v1 ship): `FM_GPS_EMIT_BATCH_MS` batches map emit events — enable only after soak testing.

---

## Verify

```powershell
# .env should contain FM_USE_CACHE_DEBOUNCE=1
.\VERIFY-ME8-FRESH.ps1
node scripts/test-scale-prep-env.js
```

Restart Fleet after changing `.env`: `.\RESTART-FLEET.bat`

---

## Static cache (dashboard assets)

**MOB:** `mob-me8-static-cache` — `lib/staticCache.js`

| Path | Cache-Control |
|------|----------------|
| `/index.html`, `/` | `no-cache` (always pick up new script tags) |
| `/vendor/*` | `public, max-age=31536000, immutable` |
| `/js/*?v=…` | `public, max-age=31536000, immutable` |
| `/js/*` (no `?v=`) | `public, max-age=3600` |
| `/locales/*.json` | `public, max-age=86400` |
| Other `.html` | `no-cache` |

After first load, **F5** should reuse disk cache for versioned scripts (fewer 304 round-trips). Hard refresh (`Ctrl+Shift+R`) still revalidates — expected.

Verify: `node scripts/test-static-cache.js`

---

## Rollback

Lab debug only — add to `.env`:

```env
FM_USE_CACHE_DEBOUNCE=0
```

---

## Next Wave 1 MOB

`mob-stability-fatal-policy` — uncaught handler policy (log + continue vs exit).
