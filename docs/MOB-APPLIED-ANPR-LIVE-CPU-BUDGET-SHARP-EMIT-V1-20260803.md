# MOB-APPLIED: ANPR-LIVE-CPU-BUDGET-SHARP-EMIT-V1

**Date:** 2026-08-03  
**Status:** APPLIED  
**Disc:** `MOB-DISC-ANPR-SLOW-CROP-FLV-JERK-SUV-FAIL-20260803.md`, `MOB-DISC-NEXT-MOB-ANPR-CPU-BUDGET-AFTER-FLV-CLARITY-20260803.md`

## Goal

Live FLV stays primary. Cut ffmpeg/AI CPU fight; stop mush SUV double cards (UNCLEAR + 11WM4).

## Changes

1. **Grab budget** (`lib/anprLivePoller.js`)
   - Log `anpr live grab ms` / skip enqueue if grab &gt; `FM_ANPR_GRAB_BUDGET_MS` (default **900**).
   - While `aiBusy` or `harvestBusy`, stretch producer to `FM_ANPR_GRAB_MS_BUSY` (default **500** ≈ 2 FPS).
   - Log `anpr live track ms` and `anpr read-macro ms`.

2. **Sharp hold before flush** (`lib/anprTrackBestFrame.js`)
   - After track gone (`MAX_AGE_MS`), if `bestSharpness` &lt; `FM_ANPR_SHARP_HOLD_FLOOR` (default **35**), wait until life ≥ `FM_ANPR_SHARP_HOLD_MS` (default **2500**) before force-flush.

3. **Sharp emit gate** (`lib/anprLivePoller.js`)
   - If not temporally locked and plate looks soft (fm &lt; `FM_ANPR_SHARP_EMIT_FM` default **35**, or conf &lt; 50, or short string) → strip plate → **Unclear** (keep crop).

4. **Same-cam spam** — `FM_ANPR_TRACK_EMIT_BLOCK_MS` default **5000**; also block per-cam for that window.

5. **Optional hatch** (`lib/frLiveProbe.js`) — set `FM_ANPR_SNAP_HTTP_URL` with `{camId}` for HTTP JPEG still; else ffmpeg FLV (unchanged default).

## Not touched

Player chase, pin Firmware Gold, HyperLPR-on-live, WVP handoff.

## Operator PASS

1. Restart ME8 (+ ANPR sidecar if needed). Hard refresh.  
2. ANPR watch ON — tile usable (less jerk than before).  
3. Fast / soft SUV — **one** Unclear **or** one good plate — not UNCLEAR + 11WM4 pair.  
4. Sharp plates (NDO/NCB class) still within ~1–2 s of leave.  
5. Stop watch → tile smooth.
