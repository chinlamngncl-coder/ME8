# MOB APPLIED — ANPR-LIVE-CROP-FIRST-RAIL-V1

**Date:** 2026-07-31  
**APPLY:** `MOB-APPLY ANPR-LIVE-CROP-FIRST-RAIL-V1`  
**Status:** APPLIED — await operator PASS  

**Disc:** `MOB-DISC-ANPR-LIVE-CROPPING-NOT-REGION-20260731.md`  
**Not in this MOB:** region packs, map-on-hit, UI redesign.

---

## What changed

| Piece | Change |
|-------|--------|
| FastALPR | Keep **detection-only** boxes (OCR text optional) |
| Sidecar `/read` | Returns `cropJpegB64` + `hasCrop` from detector ROI (tight plate JPEG) |
| Failures | `format_reject` / `low_confidence` / empty OCR **still** return crop when a box exists |
| Live poller | Saves **ROI only** — never full BWC frame as `cropUrl` |
| Emit | `anpr-crop-tick` when a **box crop** exists — plate text optional |
| Rail | Shows crop; label `Plate…` if OCR has no string yet |
| Region | **No** PH/CN hardcoding added |

**Files:**  
`anpr-sidecar/fastalpr_engine.py`, `anpr-sidecar/pipeline.py`, `lib/anprLivePoller.js`, `public/js/anpr-live-watch.js`, `public/locales/en.json`, `public/index.html`

**Cache:** `anpr-live-watch.js?v=20260731-anpr-live-crop-first-rail-v1`

---

## Operator (required)

1. **Restart ANPR sidecar** (Python change) — stop START-ANPR window, run again.  
2. **Restart ME8** server (poller change).  
3. Hard refresh → ANPR → Live → select BWC → Start watch (tile must go Live).  
4. Point at a vehicle plate.

**PASS:** 8-rail fills with **tight plate crops** (not empty, not full street scene), even before / without perfect OCR text. Matching still works when OCR + list hit.

**FAIL:** Rail still empty with plate clearly in frame; or rail still shows full-frame street.
