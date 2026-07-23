# MOB-APPLIED — FLV stream token auth V1

**APPLY:** `MOB-APPLY-FLV-STREAM-TOKEN-AUTH-V1`  
**Date:** 2026-07-20

---

## Fix

mpegts FLV GET cannot rely on `fm_session` cookie → was returning `{ ok: false, error: "Unauthorized" }`.

| Piece | Change |
|-------|--------|
| Handoff URL | `/api/lab/wvp/flv-stream?camId=…&labWvp=TOKEN` |
| Token | `wvpLabClient.issueFlvToken(upstreamFlv)` (12h sliding TTL) |
| Route auth | `requireFlvStreamAccess` — **session OR** valid `labWvp` token bound to active cam upstream |
| Global auth bypass | `isPublicPath` includes `/api/lab/wvp/flv-stream` when handoff on (token is gate) |
| Files | `lib/wvpLabClient.js`, `lib/wvpVideoHandoff.js`, `lib/dashboardAuth.js`, `server.js` |

---

## Operator smoke

1. **Restart** fleet (done by agent if service running).
2. **Hard refresh** dashboard.
3. Open **one** live tile.
4. DevTools Network → `flv-stream` request should have **`labWvp=`** in URL.
5. Response should be **`video/x-flv`** (not JSON Unauthorized).
6. Console: `[me8-flv] attach start` → `[me8-flv] attach ok`.
7. Picture on wall.

PTT parked.
