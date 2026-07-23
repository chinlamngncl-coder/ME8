# MOB APPLIED — `revert-wvp-zlm-before-invite-ops-v1`

**Date:** 2026-07-16  
**Status:** APPLIED  
**Not done:** Firmware Gold restore · Pre-Gate-C restore · any `RUN RESTORE-*`  
**Related park:** `docs/MOB-DISC-WVP-ZLM-GIVE-UP-PARKED.md`

---

## What this is

Surgical undo of wall/pin **ZLM-before-Fleet-INVITE** only.  
Ops live invite path back to **immediate Fleet FFmpeg / JSMpeg**.

---

## Answers (locked)

| Question | Answer |
|----------|--------|
| Go back to original? | **Yes — live invite order only** (before ZLM-first APPLYs). |
| Firmware / baseline restore? | **No.** |
| Gave up forever on everything? | **No.** Gave up **WVP-ZLM on Fleet ops** for now. Other work continues. |
| Fix ZLM more tonight? | **No.** Parked until a later named MOB. |

---

## Code

- `public/js/video-wall.js` — removed ZLM-first primary path; `wallZlmSoftUpgradeAllowed()` always false; Fleet `ensureInvite` / pin `requestStreamForCam` immediate again  
- Cache: `?v=20260716-revert-zlm-before-invite`

---

## Operator

1. Hard refresh Fleet `:3988`  
2. Open live — expect invite + picture on panel/pin (FFmpeg, not ZLM)
