# MOB-DISC ANPR native: events only, no /watch/start (2026-08-13)

## Operator truth (ANPR bat)

- Sidecar up on `:8768`
- Only `GET /watch/events` + `GET /health`
- **Zero** `POST /watch/start`
- Therefore: no OpenCV capture, no Stage-1/2, no RapidOCR, no Recent Plates
- Pausing the **browser** tile does **not** feed Python — Python only reads after `/watch/start`

Confirm: **START-ANPR-INGEST.bat is not required** when `FM_ANPR_NATIVE_INGEST=1` (default).

## Cause (product)

Node `lib/anprLivePoller.js` posts `/watch/start` only when **all** are true:

1. ANPR licensed
2. UI registered watch slots (`setWatchSlots` — Start watch / emitWatchSlots)
3. `resolveFlv(camId)` returns upstream FLV from WVP map (**read-only**, no ensurePlay)

If (3) fails → Fleet logs `[anpr-native] skip watchStart … no_upstream_flv` (service console, not ANPR bat).

This log proves (2)+(3) never produced a successful start this session — sidecar never saw start.

## Not the bug this turn

- Square-crop reject / restart reuse (prior APPLY) — not reached without capture
- Engine “up” badge — health only; does not mean watching

## Risk pick (one path)

**Do not** call WVP ensurePlay from ANPR (locked concurrent-stream base).

**Next APPLY (recommended):** `ANPR-NATIVE-START-FORCE-SLOT-FLV-V1`

- When operator clicks **Start watch**, browser already has tile FLV URL from handoff.
- Pass that URL (or camId + known upstream) through existing socket/API so Node can `watchStart` without waiting on a cold WVP map race.
- Still no ensurePlay from ANPR; reuse URL the tile already got.

## Operator check (no APPLY)

1. Hard refresh ANPR page (`?v=` cache if needed).
2. Click **Start watch** once (not only open panel + pause).
3. In ANPR bat: look for `POST /watch/start` or `[ANPR-NATIVE-DEBUG] start_watch`.
4. If still only events: say PASS/FAIL and whether Start watch was clicked — then APPLY above.
