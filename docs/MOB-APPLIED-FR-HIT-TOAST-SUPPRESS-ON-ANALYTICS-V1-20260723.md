# MOB APPLIED — FR-HIT-TOAST-SUPPRESS-ON-ANALYTICS-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY FR-HIT-TOAST-SUPPRESS-ON-ANALYTICS-V1`  
**Prior PASS:** `FR-LIVE-GRAB-ZLM-HANDOFF-V1` (Stage L2)

## What changed

On **Analytics → Face recognition**, the floating red hit toast (`#fr-red-toast`) is **not shown**. Top HQ bar, Known subjects, and Recent stay as-is.

| Still shows toast | Skips toast |
|-------------------|-------------|
| Operations, Evidence, Command Wall, other tabs | Analytics + Face panel visible |
| Analytics → Verify / Watchlist / etc. (not Face) | Analytics popout when Face panel visible |
| Lab **Preview toast** button (`_labPreview`) | — |

**File:** `public/js/fr-alarm.js` — `isOnAnalyticsFaceSurface()` + gate in `showRedToast`  
**Cache:** `fr-alarm.js?v=20260723-fr-hit-toast-suppress-analytics-v1`

**Operator:** **PASS** 2026-07-23 — no floating toast on Analytics Face; HQ bar remains.

## Next (after PASS)

Optional L3 `FR-MOTION-FRAME-COVERAGE-V1`, or Stage B `mob-sec-evidence-upload-safe-name`.
