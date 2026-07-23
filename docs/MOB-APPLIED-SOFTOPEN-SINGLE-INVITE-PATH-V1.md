# MOB-APPLIED: mob-softopen-single-invite-path-v1

**Date:** 2026-07-17  
**Status:** APPLIED (Google Soft Open pack MOB 1/3)  
**Order:** Before `mob-wvp-soft-try-budget-v1` · `mob-proxy-invite-reply-trace-v1`

## Mandate

Soft Open must call **only** WVP `/api/play/start` (via live broker).  
**Node must not** send Fleet `liveStreamPool.sendInviteWithFallback` SIP INVITE for Soft Open.

## What changed

| Piece | Change |
|-------|--------|
| `server.js` | `shouldSkipFleetInviteForWvpSoftOpen` — ops Soft Open skips Fleet INVITE (`invite skipped \| wvp_softopen_only`). SOS / FR / command-wall / `forceFleetInvite` still Fleet. |
| `server.js` | Adapter FFmpeg fallback blocked under Soft Open WVP-only (no collision). |
| `public/js/video-wall.js` | Soft Open attaches **WVP/ZLM primary** — no `start-video` emit · no Fleet JSMpeg-first. |
| Env | `FM_SOFTOPEN_WVP_ONLY=1` default when `FM_LAB_WVP=1` · set `0` to restore old dual path. |

## Pass / fail

| Pass | Fail |
|------|------|
| Soft Open → fleet.log **no** `invite requested` / pool INVITE for that cam | Still `invite requested` + WVP together |
| Log: `invite skipped \| wvp_softopen_only` if start-video still hits server | Fleet `408` + WVP soft timeout together |
| Later: `live broker wvp-zlm primary` (with MOB 2 budget) | Black + double INVITE |

## One line

**Soft Open = WVP only — Fleet SIP INVITE severed.**
