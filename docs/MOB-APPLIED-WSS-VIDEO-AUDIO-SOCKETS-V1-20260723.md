# MOB APPLIED — WSS-VIDEO-AUDIO-SOCKETS-V1 (Track C2)

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY WSS-VIDEO-AUDIO-SOCKETS-V1`  
**Disc:** `MOB-DISC-TLS-HTTPS-GENRE-START-C1-20260723.md`, `MOB-DISC-TLS-PLAIN-ENGLISH-20260723.md`

## What this closes

On **HTTPS** Ops (`:4438`), video/audio sockets no longer try the wrong ports (`4439` / `4440`) or plain `ws://` (browser blocks that).  

They use the **same address as the page**:
- `wss://192.168.1.38:4438/ws/video`
- `wss://192.168.1.38:4438/ws/audio`

On **HTTP** lab (`:3988`) they use:
- `ws://…:3988/ws/video` and `/ws/audio`

Old ports **3989 / 3990** still work for leftovers.

**Not in this MOB:** FLV/ZLM same-origin proxy (C3), trust-proxy (C4), PTT pulse, AES.

## Files

| Piece | Role |
|-------|------|
| `lib/dashboardMediaWsBind.js` | `/ws/video` + `/ws/audio` upgrade on HTTP+HTTPS; legacy ports kept |
| `public/js/dashboard-ws-url.js` | Build ws/wss from page origin |
| `server.js` | Wire bind on `server` + `httpsServer` |
| `video-wall.js`, `command-wall.js`, `fr-live-watch.js`, `popout-pcm-audio.js`, `live.html`, `matrix.html` | Use helper |
| `scripts/verify-wss-video-audio-sockets.js` | `npm run verify:wss-sockets` |

## Agent check

`npm run verify:wss-sockets` → **PASS** (http `/ws/*` + https `wss://…/ws/video`)

## Operator verify

1. Restart Fleet.  
2. Hard refresh Opera on `https://192.168.1.38:4438/`.  
3. Log in → open one live wall / listen.  
4. **PASS:** picture and/or listen work on HTTPS (no mixed-content block on sockets).  
5. Optional: `http://localhost:3988` still OK.

If FLV still fails from a **direct** `:18088` URL, that is **C3** — say so; sockets PASS can still stand.

## Next

`MOB-APPLY SAME-ORIGIN-MEDIA-PROXY-V1` after your PASS (if live FLV still broken on HTTPS).
