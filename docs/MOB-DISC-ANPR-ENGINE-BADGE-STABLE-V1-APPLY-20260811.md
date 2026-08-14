# MOB DISC — ANPR-ENGINE-BADGE-STABLE-V1 — 2026-08-11

**Status:** APPLIED  
**APPLY:** `MOB-APPLY ANPR-ENGINE-BADGE-STABLE-V1`  
**Read:** `.cursorrules`

## What changed

Sticky Engine badge: **3 consecutive health fails** before “Not available”. **One OK** clears the streak. Cold start (never OK) still shows Down on first fail.

| File | Change |
|------|--------|
| `public/js/anpr-live-watch.js` | `HEALTH_FAIL_NEED=3` + sticky paint on 5s poll |
| `public/js/analytics-hub.js` | same for hub `refreshAnprStatus` |
| `public/index.html` | cache bust `?v=20260811-anpr-engine-badge-stable-v1` |

Paper cause: `docs/MOB-DISC-ANPR-ENGINE-BADGE-FLICKER-20260811.md`

## Operator PASS

1. Hard refresh dashboard.
2. With sidecar healthy + live watch on: badge stays **OK** (no ON/OFF every few seconds).
3. Stop ANPR bat → within ~15s (3×5s) badge goes **Not available**.
4. Start bat again → next good poll → **OK**.
