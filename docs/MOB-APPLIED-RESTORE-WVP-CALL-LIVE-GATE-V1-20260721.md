# MOB APPLIED — Restore WVP Call live gate

**Date:** 2026-07-21  
**Authorization:** “ok go ahead. do not break other things. especially this is related to ptt.”
**Disc:** `MOB-DISC-CALL-LIVE-GATE-AND-LEFT-CALL-DARK-20260721.md`

## Scope

Restore the existing Fleet Call contract under WVP video without changing PTT transport or group behavior.

## Changes

| File | Change |
|---|---|
| `server.js` | Added `isLiveForVoiceCall`: Fleet pool live, or active WVP handoff with a dashboard viewer. Existing Call gate now uses it. |
| `public/js/video-wall.js` | Existing Fleet-row Voice/Call readiness repaints when `ptt-device-state` changes. |
| `public/index.html` | Cache tag: `video-wall.js?v=20260721-restore-wvp-call-live-gate-v1`. |

## PTT boundaries

- No edits to `lib/pttServer.js`
- No edits to PTT login, group XML, gtid 49, audio packets, hold/talk, or relay
- Existing `PTT_ENABLED` and `isDevicePttOnline` checks remain unchanged
- Call is only allowed past the live gate; PTT readiness is still enforced afterward

## Verification

- `node --check server.js` — PASS
- `node --check public/js/video-wall.js` — PASS
- IDE lint — no errors

## Operator test

1. Restart with `RESTART-FLEET.bat` as Administrator.
2. Hard refresh.
3. Start WVP live picture.
4. Press existing Call on pin/wall: no “Start live video before calling”.
5. Confirm left Voice/Call control reflects 29201 readiness.
6. Confirm PTT still works normally.
