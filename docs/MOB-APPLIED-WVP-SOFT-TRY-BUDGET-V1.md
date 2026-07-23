# MOB-APPLIED: mob-wvp-soft-try-budget-v1

**Date:** 2026-07-17  
**Status:** APPLIED (Google Soft Open pack MOB 2/3)  
**Depends on:** `mob-softopen-single-invite-path-v1`

## Mandate

Raise Soft Open WVP wait from **2s → 15s** so INVITE + encoder can finish before broker fail-open.

## What changed

| Piece | Change |
|-------|--------|
| `lib/livePlaybackBroker.js` | `FM_WVP_SOFT_TRY_MS` default **`15000`** |
| `lib/wvpLabClient.js` | `startPlaySoftTry` default **15s**; ready wait uses ~40% of budget |

Override: `FM_WVP_SOFT_TRY_MS=2000` restores old fail-open (not recommended).

## Pass / fail

| Pass | Fail |
|------|------|
| Soft Open fail log shows `softTryMs: 15000` (if still timeout) | Still `softTryMs: 2000` |
| Success: `live broker wvp-zlm primary` within ~15s | Instant `wvp_soft_try_timeout` at 2s |

## One line

**Soft Open WVP budget = 15 seconds (not 2).**
