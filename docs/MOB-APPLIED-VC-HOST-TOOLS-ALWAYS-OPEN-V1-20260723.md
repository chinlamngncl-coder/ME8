# MOB-APPLIED — VC-HOST-TOOLS-ALWAYS-OPEN-V1

**Date:** 2026-07-23  
**APPLY:** `MOB-APPLY VC-HOST-TOOLS-ALWAYS-OPEN-V1`  
**Disc:** `MOB-DISC-VC-HOST-TOOLS-ALWAYS-OPEN-20260723.md`

## What changed

Lobby Host Tools is no longer a collapsed `<details>` accordion. It is an always-visible panel: title + End Room + BWC / fixed-camera controls. Same button IDs; Join Room unchanged. Hidden while in-meeting (in-meeting bar still owns host actions).

## Files

| File | Change |
|------|--------|
| `public/js/conference-hub.js` | `renderLiveControls` lobby branch → `vc-host-tools-panel` |
| `public/index.html` | panel CSS; hide in-meeting |
| `public/js/vc-lazy.js` | cache bust |

**Cache:** `vc-lazy.js?v=20260723-vc-host-tools-always-open-v1`

## Operator verify

1. **Ctrl+F5** → Video Conference → **Live**  
2. Host Tools content visible **without** clicking to expand  
3. Join Room still works  

**PASS / FAIL:** _(operator)_
