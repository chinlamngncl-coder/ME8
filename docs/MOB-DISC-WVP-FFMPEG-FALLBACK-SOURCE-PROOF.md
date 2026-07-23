# MOB DISC - WVP/ZLM FFmpeg Fallback Source Proof

**MOB:** `mob-wvp-ffmpeg-fallback-source-proof`  
**Correction MOB:** `mob-wvp-ffmpeg-fallback-source-proof-correct`  
**Date:** 2026-07-16  
**Status:** CORRECTED - PARTIAL SOURCE PROOF ONLY, not automatic ZLM-down fallback  
**Parent architecture:** `docs/MOB-DISC-WVP-ZLM-FFMPEG-FALLBACK-ARCHITECTURE.md`

---

## Question

When WVP/ZLM is the primary live engine, can ME8 automatically fall back to FFmpeg when the WVP/ZLM live path fails?

The product target is:

```
Primary: WVP/ZLM
Failure: automatic backend fallback to FFmpeg
```

The proof must not confuse that target with the current WVP lab playback fallback chain:

```
ws_flv -> direct HTTP-FLV -> Fleet proxy to WVP FLV
```

That is browser/ZLM playback fallback. It is not automatically true FFmpeg fallback.

---

## Proof Run

Environment:

- WVP container: `me8-wvp`, up
- ZLM container: `me8-wvp-zlm`, up
- WVP base: `http://127.0.0.1:18080`
- WVP stream host: `192.168.1.38`
- Bundled FFmpeg: `vendor/ffmpeg-lgpl/ffmpeg.exe`
- FFmpeg version: `N-125478-gc6498178bb-20260706`

WVP health at proof time:

```json
{
  "ok": true,
  "deviceTotal": 2,
  "online": 2
}
```

Test camera:

```text
34020000001329000009
```

WVP `startPlay` returned these usable playback sources:

```json
{
  "flv": "http://192.168.1.38:80/rtp/34020000001329000009_34020000001329000009.live.flv?originTypeStr=rtp_push",
  "ws_flv": "ws://192.168.1.38:80/rtp/34020000001329000009_34020000001329000009.live.flv?originTypeStr=rtp_push",
  "hls": "http://192.168.1.38:80/rtp/34020000001329000009_34020000001329000009/hls.m3u8?originTypeStr=rtp_push",
  "fmp4": "http://192.168.1.38:80/rtp/34020000001329000009_34020000001329000009.live.mp4?originTypeStr=rtp_push",
  "rtsp": "rtsp://192.168.1.38:554/rtp/34020000001329000009_34020000001329000009?originTypeStr=rtp_push"
}
```

FFmpeg probe used direct ZLM HTTP-FLV:

```text
http://192.168.1.38/rtp/34020000001329000009_34020000001329000009.live.flv?originTypeStr=rtp_push
```

Probe command shape:

```powershell
ffmpeg.exe -hide_banner -loglevel info -rw_timeout 10000000 -i <zlm-http-flv> -t 6 -an -f null NUL
```

Result:

```text
Input #0, flv
Stream #0:0: Video: h264 (High), yuv420p(tv, progressive), 1280x720, 20 fps
Output #0, null, to 'NUL'
frame=121 ... time=00:00:06.00 ... speed=3.49x
exit code 0
```

The WVP play session was stopped after proof:

```json
{
  "ok": true
}
```

---

## Corrected Verdict

**PARTIAL PASS ONLY:** Bundled FFmpeg can consume the WVP/ZLM direct HTTP-FLV source returned by WVP `startPlay`.

This proves only this narrow path:

```
WVP/ZLM healthy -> ZLM HTTP-FLV -> FFmpeg can decode
```

This is **not** the automatic fallback architecture by itself, because the FFmpeg input still depends on ZLM.

Correct product meaning:

```
Normal path:
BWC -> WVP/ZLM -> ME8 dashboard

Failure path:
If WVP/ZLM is unhealthy or stream is not ready, ME8 backend returns FFmpeg path automatically.
```

Therefore this MOB did **not** complete the full fallback source proof.

---

## What This Proof Does Not Cover

This proof does **not** prove FFmpeg can replace WVP/ZLM if ZLM itself is down, stuck, has no stream, or cannot serve playback URLs.

The proven source is served by ZLM. If ZLM is unavailable, the HTTP-FLV/HLS/FMP4/RTSP URLs returned by WVP are also unavailable or suspect.

Production fallback rules must therefore separate two different things:

1. **ZLM healthy, browser/player path bad**
   - FFmpeg may read ZLM HTTP-FLV as a helper/transcode path.
   - This proof passed.

2. **WVP/ZLM live path bad**
   - ME8 must fall back to an FFmpeg source that does not depend on the failed ZLM playback URL.
   - This proof did not prove that source yet.

---

## Product Rule

For the next implementation MOB, the live adapter must expose the source truth clearly and must not hide dependency on ZLM:

```json
{
  "engine": "zlm",
  "helper": {
    "kind": "ffmpeg-from-zlm-http-flv",
    "available": true,
    "covers": ["browser_player_decode_issue", "transcode_from_healthy_zlm"],
    "doesNotCover": ["zlm_process_down", "zlm_no_stream", "wvp_startplay_failure"]
  }
}
```

True fallback must be reported separately:

```json
{
  "engine": "ffmpeg",
  "source": "independent-or-fleet-transitional",
  "reason": "zlm_unavailable"
}
```

No silent wording like "FFmpeg fallback" without source type and failure coverage.

---

## Correct Architecture Statement

The agreed architecture is:

```
WVP/ZLM primary
-> if WVP/ZLM path fails
-> backend automatically returns FFmpeg
-> dashboard stays inside ME8
```

This correction exists because the first proof write-up made the helper path sound like the full fallback. That was wrong.

---

## Next MOB Candidate

Recommended next:

```text
mob-wvp-live-adapter-contract-v1
```

Scope for that MOB:

- Add backend descriptor contract for live engine choice.
- Include explicit `primary`, `fallback`, `source`, and `covers`.
- Treat `ffmpeg-from-zlm-http-flv` as a helper path only, not true ZLM-down fallback.
- Define or prove the independent FFmpeg source used when WVP/ZLM fails.
- Do not touch wall/pin video directly.
- Do not change ZLM config.
- Keep current WVP lab panel until the production descriptor path is proven.
