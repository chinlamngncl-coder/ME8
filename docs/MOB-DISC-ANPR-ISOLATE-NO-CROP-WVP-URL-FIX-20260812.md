# MOB DISC — ANPR isolate broke crop/match (root cause + fix)

**Date:** 2026-08-12  
**Status:** HOTFIX under `ANPR-POLLER-ISOLATE-WORKER-V1`  
**Operator:** Nothing matching / cropping after isolate.

---

## What broke (plain)

Child Node process **does not share WVP memory** with Fleet main.

After isolate:

1. Child called `grabJpegForFr` → looked up `wvp.getUpstreamFlv` **inside the child**  
2. Child’s WVP map is **empty** → no JPEG → no crop → no OCR → no rail  

Not “plates got worse.” **Ingest never started.**

---

## Fix (applied)

Main syncs **`liveFlv` URLs** to child every 1s.  
Child grabs via `grabJpegFromFlv(url)` — no WVP state needed in child.

Files: `lib/anprLivePoller.js` (push `liveFlv`), `lib/anprLivePollerRuntime.js` (use URL).

---

## You do

1. **Restart Fleet** (must respawn anpr-child).  
2. Keep `START-ANPR.bat` running.  
3. Open Live ANPR on a cam that is **actually live** (WVP play / wall).  
4. PASS = crops + plates again; roster should still stay stable.

**Emergency hatch:** `FM_ANPR_POLLER_ISOLATE=0` in Fleet env → old in-process poller (works, presence risk returns).

---

## Lesson for FR / Weapon isolate

Same trap: **never** assume handoff/pool state exists in the child. Always push **stream URLs or frames** from main.
