# MOB-APPLIED: mob-live-broker-failopen-fast-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**Priority:** LAST SHOT / pre-ship live L1 — ops picture before Plan A

## Intent

Soft Open must **not** hang the wall on WVP `receive_stream_timeout` (25s+ + stack clean + retry).  
Cap WVP soft try (~**2s**) → fail-open to Fleet / zlm-relay / FFmpeg path.

**Does not claim** `wvp-zlm primary`.  
**Does not** strip `FM_LAB_WVP`.

## What changed

### `lib/livePlaybackBroker.js`
- Soft Open uses budget `FM_WVP_SOFT_TRY_MS` (default **2000**)
- Calls `wvp.startPlaySoftTry` (not full `startPlay`)
- If Fleet pool already live → **skip** WVP soft try (`FM_WVP_SOFT_SKIP_WHEN_POOL_LIVE`, default on)
- On miss: log `wvp_soft_try_timeout` or `wvp_startplay_failure` — **no** `listDevices` dig

### `lib/wvpLabClient.js`
- New `startPlaySoftTry(deviceId, channelId, { budgetMs })`
  - One short HTTP `/api/play/start/...` with `timeoutMs = budget`
  - **No** `syncLanSourceIps` / `preparePlaySlot` / retry (those stay on full `startPlay` for lab diagnose)

## Env

| Var | Default | Meaning |
|-----|---------|---------|
| `FM_WVP_SOFT_TRY_MS` | `2000` | Soft Open WVP HTTP budget (ms) |
| `FM_WVP_SOFT_SKIP_WHEN_POOL_LIVE` | `1` | Skip WVP when Fleet already streaming |

## Prove (operator)

1. Restart Fleet (broker change).
2. Soft Open Chin (and/or kk).
3. Expect picture on **Fleet / FFmpeg / zlm-relay** path within a few seconds — wall must not sit on “Live streaming…” for a full WVP timeout.
4. In `storage/fleet.log` look for either:
   - `live broker fallback` · `reason: wvp_soft_try_timeout` (or `wvp_startplay_failure`) · `softTryMs: 2000`
   - then Fleet path logs (`zlm-relay primary` / ffmpeg fallback) — **not** minutes of wait
5. Optional: if pool already live, `live broker wvp soft skip` · `pool_already_live`

## Out of scope (next MOBs)

- L2 `mob-zlm-relay-discardcorrupt-v1` (Plan B harden)
- L5 `mob-wvp-invite-rtp-answer-v1` (Plan A stream)

## Related

- `docs/MOB-DISC-LAST-SHOT-HARDENING-HIGHEST-PRIORITY.md`
- `docs/MOB-DISC-PRE-SHIP-LIVE-ONE-BY-ONE-20260717.md` (L1)
