# MOB — WVP tile FLV absolute URL

**Status:** APPLIED 2026-07-14 — `mob-track-b1-flv-absolute-url`  
**Scope:** mpegts worker URL only. No wall / Open All / pool FFmpeg.

## Why

Tile showed **playing** + BWC called, but spinner forever.  
WVP→ZLM FLV upstream was healthy; client passed a **relative** `/api/lab/wvp/flv?…` to mpegts (worker resolves wrong). Same lesson as `live-player-factory.js`.

## Change

- `public/js/wvp-lab-tile.js` — `absolutizeUrl` before `mpegts.createPlayer`
- `public/test-wvp-tile.html` — same
- cache bust `?v=20260714-b1-flv-abs`

## Prove

1. Hard refresh dashboard (`http://192.168.1.38:3988`)
2. Lab tile → Play on kk (SIP **5061**)
3. Log should show `playing http://192.168.1.38:3988/api/lab/wvp/flv?…`
4. Picture = **PASS**; still spinner = **FAIL**
