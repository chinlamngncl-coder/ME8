# MOB-APPLIED: mob-wvp-zlm-flv-player-error-v1

**Date:** 2026-07-17  
**Status:** APPLIED (Soft Open UI / FLV / Stop pack — MOB 1/3)  
**Next (wait for APPLY):** `mob-ui-ghost-pin-cleanup-v1` → `mob-wvp-softopen-stop-bridge-v1`

## Mandate

Fix Soft Open **Player error** after SIP `200 OK` + `live broker wvp-zlm primary`:

1. Browser must get **LAN** FLV (`192.168.1.38:18088`), never `127.0.0.1`
2. ZLM CORS open for cross-origin mpegts
3. Log ZLM media presence (empty track / stream timeout diagnosis)

## What changed

| Piece | Change |
|-------|--------|
| `lib/wvpLabClient.js` | Split rewrite: **browser** → `FM_WVP_STREAM_HOST` + port **18088**; **proxy** upstream → `127.0.0.1:18088`. Log `wvp play flv urls` + `wvp zlm media presence`. |
| `lib/livePlaybackBroker.js` | Soft Open descriptor `flvUrl` = **direct LAN** when `FM_WVP_DIRECT_FLV=1`; keep `wvp.proxyFlv` for fallback. |
| `public/js/live-player-factory.js` | Soft overlay: direct first → proxy on error; `withCredentials` only for same-origin proxy (CORS-safe). |
| `public/index.html` | Cache bust `live-player-factory.js?v=20260717-flv-lan-direct` |
| `docker/wvp/zlm-modern/config.ini` | Confirm `allow_cross_domains=1` (modern ZLM CORS; not legacy `cors=1`) |

## Pass / fail (operator)

1. Restart Fleet (pick up Node changes). WVP lab already up — no ZLM restart needed unless CORS was ever `0`.
2. Hard refresh dashboard once.
3. Soft Open Chin (or kk).

| Pass | Fail |
|------|------|
| Picture on wall/pin | Still **Player error** / black |
| fleet.log: `uiFlvHost` like `192.168.1.38:18088` (not `127.0.0.1`) | `uiFlvHost` still loopback |
| Optional: browser console `[me8-zlm] soft play primary 192.168.1.38:18088` | |
| If still fail + log `wvp zlm media presence` `online:false` → media empty (not URL) — check ZLM stream timeout | |

## One line

**Soft Open FLV = LAN `:18088` direct, proxy fallback, CORS-safe.**
