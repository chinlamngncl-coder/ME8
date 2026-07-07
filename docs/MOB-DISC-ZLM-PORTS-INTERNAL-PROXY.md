# MOB DISC — ZLM internal FLV proxy (Gate B)

**Status:** **APPLIED** — proxy auth fix (`labFlv` token) after FAIL 2026-07-06 ~14:40  
**Search:** `flv proxy`, `:8080`, `internal proxy`, `dashboard origin`

---

## Problem

`test-zlm.html` played FLV from `http://127.0.0.1:8080/...` while the dashboard is on `:3988`. That is wrong for ship (extra WAN port, CORS, HTTPS).

---

## Fix

| Piece | Role |
|-------|------|
| `lib/zlmFlvProxy.js` | Pipe ZLM HTTP-FLV → dashboard response |
| `GET /api/lab/zlm/flv/:streamFile` | Auth + lab-only; browser hits **same origin** |
| `lib/zlmIngestLab.js` | `flvPlayUrl` → `/api/lab/zlm/flv/{id}.live.flv` when `FM_LAB_ZLM=1` |
| `lib/livePlaybackBroker.js` | Passes proxied URL to test page |

ZLM **RTMP publish** still uses `127.0.0.1:19350` (server-side only). Only **browser play** moved to dashboard origin.

---

## FAIL 2026-07-06 ~14:40 — proxy without auth token

**Symptoms:** `zlmHealthy=true`, relay first frame OK, `ZLM FLV play ok: /api/lab/zlm/flv/….flv`, then immediate **FLV player error**.

**Cause:** `mpegts.js` fetches FLV **without** dashboard session cookies → `401 Unauthorized` → proxy never logged `zlm flv proxy open`.

**Fix:** `flvPlayUrl` appends short-lived `?labFlv=` token from `/api/lab/playback`; proxy accepts **session OR token**. `withCredentials: true` on player as backup.

---

## Retest

1. `RESTART-FLEET.bat`
2. Open All → `test-zlm.html` → Play
3. Log should show `ZLM FLV play ok: /api/lab/zlm/flv/….live.flv` (not `:8080`)
4. Fleet log: `zlm flv proxy open`

Reply **PROXY PASS** or **FAIL**.

---

## Related

- `docs/MOB-DISC-ZLM-GATE-B-PASS.md`
