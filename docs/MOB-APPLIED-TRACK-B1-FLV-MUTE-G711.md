# MOB — WVP tile mute G.711 (MSE)

**Status:** APPLIED 2026-07-14 — `mob-track-b1-flv-mute-g711`  
**Scope:** mpegts mediaDataSource only.

## Why

After FLV auth allow, player got `MediaError CodecUnsupported`.  
Stream = H.264 video + **G.711A** audio. Browser MSE cannot decode G.711.

## Change

- `hasAudio: false`, `hasVideo: true` on lab tile + test page
- cache bust `?v=20260714-b1-mute-g711`

## Prove

Hard refresh → Play. Picture (silent) = **PASS**.
