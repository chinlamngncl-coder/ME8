# MOB APPLIED — ANPR-LIVE-WHOLE-VEHICLE-CROP-V1

**Date:** 2026-07-31  
**APPLY:** `ANPR-LIVE-WHOLE-VEHICLE-CROP-V1`  
**Status:** APPLIED — await operator PASS  
**Disc:** `MOB-DISC-ANPR-LIVE-SLOTS-CUTOFF-AND-WHOLE-VEHICLE-20260731.md`

---

## What changed

| Before | After |
|--------|--------|
| Vehicle pad **8%** → scrap / bumper | Pad **42%** + min **~40%** of frame hull (cap ~92%) |
| Rail primary could fall back to **tight plate** | Primary = **`vehicleUrl` only**; plate is small secondary thumb |
| Plate with no vehicle → plate scrap on rail | **Plate-hull** scene around plate (expanded) as `vehicleJpegB64` |
| Rank by score only | Prefer **larger** vehicle in frame (score × area) |

**Files:** `anpr-sidecar/vehicle_detect.py`, `pipeline.py`, `public/js/anpr-live-watch.js` (`?v=20260731-anpr-live-whole-vehicle-crop-v1`)

**Not in this MOB:** 16-rail compact layout, PiP grab.

---

## Operator

1. Restart **ANPR** (`START-ANPR.bat`) + hard refresh.  
2. Live watch → point at motor / car / bus / lorry.

**PASS:** Rail shows a **recognizable whole (or mostly whole) vehicle**, not blue plate scrap. Plate text/thumb still OK when readable.  
**FAIL:** Still plate scrap as main thumb, or empty with vehicle filling the lens.
