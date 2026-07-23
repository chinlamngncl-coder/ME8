# MOB-APPLIED — VC-SETTINGS-FORM-TOP-FW-BORDER-V1

**Date:** 2026-07-22  
**APPLY:** `MOB-APPLY VC-SETTINGS-FORM-TOP-FW-BORDER-V1`  
**Disc:** `MOB-DISC-VC-SETTINGS-SWAP-AND-FW-BORDER-20260722.md`

## What changed

1. **Conference service** form card is **first** (top).  
2. **Current status** + **Firewall ports** sit **below**, still side-by-side.  
3. Firewall table keeps the **bottom line under the last row** (WebRTC) — removed `tr:last-child td { border-bottom: none }`.

## Files

| File | Change |
|------|--------|
| `public/js/conference-hub.js` | `renderSettings()` order: form → info row |
| `public/index.html` | Drop last-row border strip on `.vc-settings-fw` |
| `public/js/vc-lazy.js` | Cache `conference-hub.js?v=20260722-vc-settings-form-top-fw-v1` |
| `public/index.html` | `vc-lazy.js?v=20260722-vc-settings-form-top-fw-v1` |

## Operator verify

1. **Ctrl+F5**  
2. Video Conference → **Settings**  
3. Top card = **Conference service**  
4. Below = Current status | Firewall ports  
5. Line under WebRTC row matches line under signaling row  

**PASS / FAIL:** _(operator)_
