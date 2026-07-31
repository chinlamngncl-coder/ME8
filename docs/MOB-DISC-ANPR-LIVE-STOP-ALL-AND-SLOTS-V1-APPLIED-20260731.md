# MOB APPLIED — ANPR-LIVE-STOP-ALL-AND-SLOTS-V1

**Date:** 2026-07-31  
**Status:** APPLIED — operator verify  
**Parent:** `MOB-DISC-ANPR-LIVE-STOP-ALL-AND-SLOTS-20260731.md`

## Changes

| Item | Now |
|------|-----|
| Buttons | Start · Stop · **Stop all** (confirm → stop video + clear selection) |
| On-screen tiles | **4** |
| Watch set | **16** selectable; rotate onto tiles when more than 4 |
| Meta | `{n}/16 selected · {live}/4 live` |
| Poller default | `FM_ANPR_LIVE_MAX_CAMS=4` (OCR on active tile cams) |
| Cache | `anpr-live-watch.js?v=20260731-anpr-live-stop-all-slots-v1` |

## Operator PASS

1. Hard refresh (restart if poller still on old 2-cam default).  
2. ANPR → Live → see **Stop all** and **4** tiles.  
3. Select more than 2 BWCs → Start → up to 4 live; meta not stuck at `/2`.  
4. Stop all → confirm → video off + 0 selected.
