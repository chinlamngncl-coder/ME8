# MOB-APPLIED — TACTICAL-POI-DRAG-DELETE-CLARITY-V1

**Date:** 2026-07-26  
**APPLY:** `MOB-APPLY TACTICAL-POI-DRAG-DELETE-CLARITY-V1`  
**Disc (locked):** `MOB-DISC-TACTICAL-PIN-KINDS-BWC-FIXED-POI-20260726.md`

## Pin design (locked)

| Kind | Behavior |
|------|----------|
| **BWC** | GPS only — no drag / no Delete POI |
| **Prepared / fixed-linked POI** | Stays put; **drag pin** to edit place; **Delete** (confirm) to remove |

## Fixes

1. Prepared POIs **excluded from colocated spread** (spread was yanking pins after drag — felt like “POI 1 can’t move”).  
2. Stronger **dragstart / dragend** (map pan off while dragging; place saved on drop).  
3. **Selected** hint under PREPARE + status line.  
4. List row **Delete** + confirm dialog.  
5. Popup note: video bar ≠ pin move.

## Files

- `public/js/tactical-poi.js`
- `public/index.html` (hint + cache `20260726-poi-drag-delete-clarity-v1`)
- `public/css/global.css`
- `public/locales/en.json`
- `docs/MOB-DISC-TACTICAL-PIN-KINDS-BWC-FIXED-POI-20260726.md`
- `scripts/verify-tactical-poi-drag-delete-clarity-v1.js`

## Verify

```text
npm run verify:tactical-poi-drag-delete-clarity
```

## Operator smoke

1. Restart / **Ctrl+F5**.  
2. Tactical PREPARE → Place POI twice.  
3. Drag **POI 1** and **POI 2** markers — both should stay where dropped.  
4. Select → **Delete** (confirm) removes.  
5. BWC GPS pin (if any) still not draggable.  
6. Reply **PASS** / **FAIL**.
