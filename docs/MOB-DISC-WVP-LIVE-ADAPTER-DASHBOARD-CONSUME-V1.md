# MOB DISC - WVP/ZLM Dashboard Consume Adapter v1

**MOB:** `mob-wvp-live-adapter-dashboard-consume-v1`  
**Date:** 2026-07-16  
**Status:** APPLIED - minimal wall descriptor consumption  
**Code touched:** `public/js/video-wall.js`

---

## Goal

Dashboard live wall should consume the backend descriptor without losing the original FFmpeg/JSMpeg safety path.

Product behavior:

```text
JSMpeg/FFmpeg starts first and stays underneath
ZLM overlay is attempted only when safe
If ZLM works, overlay shows
If ZLM fails, overlay is removed and ME8 asks backend for descriptor again
If backend returns FFmpeg, original JSMpeg path remains active
```

---

## What Changed

Added a tiny wall helper:

```text
requestWallFfmpegFallbackDescriptor(slotKey, camId)
```

It calls:

```text
Me8LivePlayerFactory.fetchDescriptor(camId)
```

only after:

- backend descriptor returns `engine: "ffmpeg"` instead of `engine: "zlm"` during the soft ZLM attempt, or
- ZLM overlay fails proving playback.

The helper does not destroy, replace, or recreate the player. It only lets the backend descriptor path trigger/confirm FFmpeg fallback while the existing JSMpeg canvas remains in place.

---

## Safety Rules Preserved

- Original FFmpeg/JSMpeg stays underneath.
- ZLM overlay remains soft.
- No wall wipe.
- No Open All migration.
- No pin mirror change.
- No PTT or missed-alert change.
- No SIP server change.
- No ZLM config change.
- No `live-player-factory.js` change.

---

## Rollback

If this fails, rollback is only:

```text
revert public/js/video-wall.js to the pre-MOB state
```

No backend rollback is required just to restore original wall behavior, because this MOB does not remove the original player path.

---

## Verification

Performed:

- `node --check public/js/video-wall.js`
- Scoped diff confirmed only `public/js/video-wall.js` changed for this MOB.

---

## Next

Live test:

1. Start one BWC live wall stream.
2. Confirm original JSMpeg live still appears.
3. Let ZLM overlay attempt.
4. If ZLM fails, confirm video remains via FFmpeg/JSMpeg.
5. Check backend descriptor/logs for fallback start or already-live status.
