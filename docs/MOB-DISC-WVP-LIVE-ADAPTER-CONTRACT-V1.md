# MOB DISC - WVP/ZLM Live Adapter Contract v1

**MOB:** `mob-wvp-live-adapter-contract-v1`  
**Date:** 2026-07-16  
**Status:** APPLIED - backend descriptor contract only  
**Code touched:** `lib/livePlaybackBroker.js`

---

## Goal

ME8 backend owns the live-engine decision.

Product target:

```text
Primary: WVP/ZLM
Failure: automatic backend fallback to FFmpeg
Dashboard: remains inside ME8
```

This MOB adds the descriptor contract shape needed for that target without changing wall/pin/PTT/SIP core logic.

---

## Contract

`GET /api/live/playback?camId=<cameraId>` still returns backward-compatible fields:

- `engine`
- `flvUrl` when ZLM is selected
- `wsUrl` when FFmpeg is selected
- `fallbackAvailable`
- `reason`

It now also returns explicit source blocks:

```json
{
  "ok": true,
  "camId": "340200...",
  "engine": "zlm",
  "source": "zlm-side-relay",
  "primary": {
    "engine": "zlm",
    "source": "zlm-side-relay",
    "healthy": true,
    "ready": true,
    "reason": null,
    "streamId": "340200..."
  },
  "selected": {
    "engine": "zlm",
    "source": "zlm-side-relay",
    "url": "/api/lab/zlm/flv/..."
  },
  "fallback": {
    "engine": "ffmpeg",
    "source": "fleet-transitional",
    "available": true,
    "active": false,
    "automatic": true,
    "reason": null,
    "wsUrl": "ws://host:3989/?camId=340200...",
    "covers": [
      "zlm_unhealthy",
      "zlm_stream_not_ready",
      "zlm_relay_inactive",
      "zlm_player_retry_failed"
    ]
  },
  "helper": {
    "kind": "ffmpeg-from-zlm-http-flv",
    "role": "helper-only"
  }
}
```

---

## Automatic Selection

When ZLM is healthy and ready:

```json
{
  "engine": "zlm",
  "selected": { "engine": "zlm" },
  "fallback": { "engine": "ffmpeg", "available": true, "active": false }
}
```

When ZLM is unhealthy, not ready, or relay is inactive while Fleet FFmpeg pool is live:

```json
{
  "engine": "ffmpeg",
  "selected": { "engine": "ffmpeg", "source": "fleet-transitional" },
  "fallback": { "engine": "ffmpeg", "available": true, "active": true }
}
```

When neither path is active:

```json
{
  "engine": "idle",
  "selected": { "engine": "idle" },
  "fallback": { "available": false }
}
```

---

## Important Source Truth

Current source labels are intentionally honest:

- `zlm-side-relay`: current ME8 ZLM side path.
- `fleet-transitional`: existing FFmpeg safety path.
- `ffmpeg-from-zlm-http-flv`: helper/transcode from healthy ZLM only, not true ZLM-down fallback.

This MOB does not claim final WVP/ZLM production migration is complete. It creates the backend descriptor shape so the next MOB can wire WVP/ZLM primary and FFmpeg fallback without hiding source dependency.

---

## Not Changed

- No wall/pin video file edits.
- No PTT or missed-alert edits.
- No SIP server edits.
- No ZLM config tuning.
- No customer UI removal.
- No WVP lab panel removal.

---

## Next MOB

Recommended next:

```text
mob-wvp-live-adapter-wvp-primary-v1
```

Purpose:

- Use WVP/ZLM as the primary descriptor source.
- Keep FFmpeg as automatic fallback when WVP/ZLM fails.
- Keep `source` and `covers` explicit so the dashboard never confuses helper paths with real fallback.
