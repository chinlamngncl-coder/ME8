# MOB-APPLIED: mob-zlm-relay-discardcorrupt-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**Source:** LAST SHOT / Google G3 Plan B harden  
**File:** `lib/zlmLabRelay.js`

## Intent

Harden **Plan B** (`zlm-relay`) when WVP Plan A is dead: discard junk MPEG before encode, bigger probe, **no** `-vf scale` (including probe-locked scale). Keep `libopenh264`.

**Does not claim** `wvp-zlm primary`. Soft Open may still show Fleet underlay / Plan B — that is fail-open, not Plan A win.

## What changed

| Before (fixed-output-size) | After (this MOB) |
|----------------------------|------------------|
| `-vf scale=W:H` from probe | **Removed** — native after valid header |
| probesize/analyze ~2M/1.5M | **10000000** / **10000000** |
| fflags had discardcorrupt + nobuffer | `+genpts+discardcorrupt` (Google form) |
| — | `-ignore_unknown` |
| Probe **blocked** spawn | Prime flush → spawn; size probe is **log only** |

Encoder stays **`libopenh264`**.

## Log expect

- `zlm relay ffmpeg spawned` · `geometry: native-no-scale-v1` · `discardcorrupt: true`
- Optional: `zlm relay native size log` · `outWidth` / `outHeight`
- Soft path may still log `live broker zlm-relay primary` (Plan B) or ffmpeg fallback — **not** `wvp-zlm primary` until L5

## Operator

1. Restart Fleet  
2. Soft Open Chin / kk once  
3. Pass/fail on: fewer res drops / less need to re-open; log lines above  

## Revert this MOB only

Restore `lib/zlmLabRelay.js` from pre-this-MOB snapshot:

- Pack: `baseline/2026-07-14-pre-gate-c/pack/...` (see MANIFEST) **or**  
- Full stack unwind: see `docs/MOB-DISC-LIVE-STACK-REVERT-LATER.md`

---

## Related

- `docs/MOB-DISC-GOOGLE-REPLY-KEEPALIVE-AND-PLAN-B-0x0.md`  
- `docs/MOB-DISC-LAST-SHOT-HARDENING-HIGHEST-PRIORITY.md`  
- Supersedes scale lock in `MOB-APPLIED-ZLM-RELAY-FIXED-OUTPUT-SIZE-V1.md` for Plan B encode path  
