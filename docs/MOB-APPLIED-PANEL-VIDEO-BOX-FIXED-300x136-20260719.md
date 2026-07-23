# MOB-APPLIED — Panel video box fixed 300×136 (2026-07-19)

**APPLY:** `MOB-APPLY-PANEL-VIDEO-BOX-MATCH-PIN-SIZE`  
**Operator:** fixed basic **300×136**; do **not** follow pin compact/crowded size logic.

## Done

| Item | Change |
|------|--------|
| `#video-wall` | Width **312px** (room for 300 + pad; map shifts left) |
| `.video-slot-stage` | Fixed **300×136** |
| Video fit | **contain** (full frame in that box) |
| Slot pack | Top-aligned; blank below |
| Pin size logic | **Not used** |

## Not touched

- Pin CSS / compact / crowded / mirror cores  
- Call / PTT / SOS  

## You

Hard refresh → panel video box vs pin basic size → full picture in box → pass/fail.
