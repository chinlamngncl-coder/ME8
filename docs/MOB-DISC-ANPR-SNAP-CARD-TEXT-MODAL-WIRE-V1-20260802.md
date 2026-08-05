# MOB-DISC — ANPR Snap Card Text + Modal Wire V1

**Date:** 2026-08-02  
**APPLY:** `ANPR-SNAP-CARD-TEXT-MODAL-WIRE-V1`  
**Scope:** Frontend data mapping only — `public/js/anpr-live-watch.js` + cache-bust in `public/index.html`.  
**Forbidden:** Tailwind invent, new modal id, Python, card HTML structure rewrite.

## Locked

| Helper | Contract keys (prefer first) |
|--------|------------------------------|
| Plate | `plateText` → `plate` → `plateCompact` → dual consensus |
| Macro | `macroCropUrl` → `vehicleUrl` → `sceneUrl` |
| Micro | `microCropUrl` → `cropUrl` → `plateUrl` |
| BWC | `bwcUser` → `deviceLabel` → cam id |
| When | `at` → `time` → `capturedAt` → `ts` |

- Existing `ax-anpr-snap-card` slots unchanged (CSS classes preserved).
- Magnifier `data-anpr-open` → `openAnprModal(idx, scope)` → `#ax-anpr-snap-lightbox` via hardened `openLightbox`.
- `pushRail` accepts contract URL/text keys so captures are not dropped.
- Cache: `anpr-live-watch.js?v=20260802-snap-card-text-modal-wire-v1`

## Operator

1. Hard-refresh dashboard (cache-bust string above).
2. Live or Offline capture → card shows plate, time, BWC badge.
3. Click magnifier → lightbox shows macro + micro + plate + BWC + when.
