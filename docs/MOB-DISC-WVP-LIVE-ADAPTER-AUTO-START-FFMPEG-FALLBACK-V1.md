# MOB DISC - WVP/ZLM Auto-start FFmpeg Fallback v1

**MOB:** `mob-wvp-live-adapter-auto-start-ffmpeg-fallback-v1`  
**Date:** 2026-07-16  
**Status:** APPLIED - backend fallback start path  
**Code touched:** `lib/livePlaybackBroker.js`, `server.js`

---

## Goal

Full professional fallback behavior:

```text
Operator asks ME8 for live video
-> ME8 tries WVP/ZLM descriptor path
-> if ZLM is disabled, unhealthy, stream not ready, or relay inactive
-> ME8 automatically starts the existing FFmpeg live pool
-> descriptor returns engine: "ffmpeg"
```

The operator stays inside ME8. The dashboard does not need to know how to recover manually.

---

## What Changed

`lib/livePlaybackBroker.js` now has a guarded fallback-start hook:

- If FFmpeg pool is already live, descriptor returns `engine: "ffmpeg"` with `fallback.start.status: "already_live"`.
- If an invite is already in flight, descriptor returns `engine: "ffmpeg"` with `fallback.start.status: "invite_in_flight"`.
- If no starter is supplied, the broker remains read-only and returns `idle`.
- If the server supplies a starter, the broker calls it once and returns `engine: "ffmpeg"` with `fallback.start.status: "start_requested"`.

`server.js` supplies that starter only for `/api/live/playback`.

---

## Guardrails

The server fallback starter refuses to start a duplicate or unsafe stream:

- Already streaming -> no duplicate start.
- Invite in flight -> no duplicate start.
- Missing camera contact -> no start.
- BWC active in video conference ingress -> no takeover.
- Dashboard live cap reached -> no start unless already watching the same camera.

All starts and blocks are logged through `log.media`.

---

## Descriptor Meaning

When auto-start is requested:

```json
{
  "engine": "ffmpeg",
  "source": "fleet-transitional",
  "reason": "zlm_unhealthy",
  "selected": {
    "engine": "ffmpeg",
    "source": "fleet-transitional"
  },
  "fallback": {
    "engine": "ffmpeg",
    "available": true,
    "active": false,
    "automatic": true,
    "start": {
      "ok": true,
      "status": "start_requested"
    }
  }
}
```

`active: false` at first means FFmpeg has been requested but the SIP invite may still be connecting. Once the stream is established, the next descriptor reports the existing FFmpeg pool path.

---

## Still Honest About Source

This is automatic fallback, but the current FFmpeg source label remains:

```text
fleet-transitional
```

That means the fallback uses the existing ME8/Fleet FFmpeg live pool. It is independent from ZLM playback URLs, so it can cover ZLM-down cases. It is still called transitional because the final WVP primary integration is not yet fully migrated into customer dashboard flow.

---

## Not Changed

- No wall/pin video internals changed.
- No PTT or missed-alert files changed.
- No SIP server core changed.
- No ZLM config changed.
- No WVP lab panel removed.
- No customer UI removal.

---

## Verification

Performed syntax and mocked descriptor tests:

- `node --check lib/livePlaybackBroker.js`
- `node --check server.js`
- Broker auto-start mock: ZLM bad -> exactly one FFmpeg start request.
- Broker in-flight mock: invite already in flight -> no duplicate start.
- Broker read-only mock: no starter supplied -> remains idle.

---

## Next MOB Candidate

```text
mob-wvp-live-adapter-dashboard-consume-v1
```

Purpose:

- Make dashboard live requests consume the descriptor as the source of truth.
- Keep ZLM primary.
- Use automatic FFmpeg fallback from this MOB.
- Do not remove the lab panel until production path passes.
