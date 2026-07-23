# MOB APPLIED — FR-BLACKLIST-MAP-PIN-TAKEOVER-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY FR-BLACKLIST-MAP-PIN-TAKEOVER-V1`  
**Disc:** `MOB-DISC-FR-GRADE-COLOUR-TOAST-MAP-TAKEOVER-ZONE-PTT-20260723.md`  
**Prior PASS:** colour toast + Face toast suppress

## What changed

On **Blacklist** hit (auto go-ops or explicit Go to map):

1. Map **zooms** to catching pin (zoom ≥ **18**).  
2. `VideoWall.promoteFrBlacklistLive(camId)`:
   - Reuse wall slot if already live  
   - Else free pin-capable panel (1–8)  
   - Else **steal** an unpinned, non-SOS panel (pinned fleet selection protected first; if all pinned → steal + toast)  
   - Open map pin popup + start/play live; enforce max **8** open pin popups favoring the hit cam  
3. Wall panel gets `.fr-blacklist-hit` red ring  

Soft grades (POI / monitoring / suspect) **unchanged** — no takeover, no auto map.

**Files:** `public/js/video-wall.js` (additive API only), `public/js/fr-alarm.js`, `public/index.html` (CSS + `window.enforceMaxOpenPinPopups`)  
**Cache:** `video-wall.js` / `fr-alarm.js` `?v=20260723-fr-blacklist-map-pin-takeover-v1`

## Operator verify

1. Ctrl+F5. Restart Fleet if needed.  
2. Set **ds** (or test row) to **Blacklist**.  
3. Prefer: Open All so **~8** pin/wall lives are up.  
4. Analytics Face → watch → get Blacklist hit (or hit from Ops).  

**PASS:** Ops map zooms to that pin; one wall/pin live shows the catching BWC (took a free or unpinned slot).  
**FAIL:** no live / wrong cam / SOS panel stolen → tell agent.

## Next

`MOB-APPLY FR-BLACKLIST-ZONE-PTT-POLISH-V1` (optional) or redact / security.
