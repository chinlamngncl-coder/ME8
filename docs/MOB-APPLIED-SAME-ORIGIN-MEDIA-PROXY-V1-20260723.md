# MOB APPLIED — SAME-ORIGIN-MEDIA-PROXY-V1 (Track C3)

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY SAME-ORIGIN-MEDIA-PROXY-V1`  
**Disc:** `MOB-DISC-TLS-HTTPS-GENRE-START-C1-20260723.md`

## What this closes

On **HTTPS** Ops, the browser must **not** load live FLV from raw `http://…:18088`. Picture goes through the **same page origin** (`/api/lab/…`).

## What landed

| Piece | Role |
|-------|------|
| `lib/sameOriginMedia.js` | `toBrowserFlvUrl` + session allowlisted `proxyUpstreamFlv` |
| `GET /api/lab/media/upstream-flv?u=` | Pull allowlisted ZLM HTTP into dashboard (login session) |
| `lib/wvpVideoHandoff.js` | Stop hardcoded `:3988` absolutize; browser URLs stay `/api/lab/…` |
| `lib/zlmIngestLab.js` | FLV proxy also when WVP handoff / HTTPS enabled |
| `live-player-factory.js` | On HTTPS, rewrite leftover `http://…:18088` to upstream-flv |

**Not in this MOB:** C4 trust-proxy · PTT pulse · AES · nginx install.

## Agent check

`npm run verify:media-proxy` → **PASS**

## Operator verify

1. Restart Fleet.  
2. Hard refresh `https://192.168.1.38:4438/`.  
3. Open live on one cam.  
4. **PASS:** picture plays on HTTPS (no mixed-content block to `:18088`).  
5. Optional: HTTP `:3988` still OK.

## Next

`MOB-APPLY TRUST-PROXY-AND-HOST-V1` when you want C4 (behind a real reverse proxy later).
