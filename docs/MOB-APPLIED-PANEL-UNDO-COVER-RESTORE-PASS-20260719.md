# MOB-APPLIED — Undo cover → restore PASS (2026-07-19)

**APPLY:** `MOB-APPLY-PANEL-UNDO-COVER-RESTORE-PASS`  
**Operator:** “APPLY (e.g. undo cover → restore the real PASS) no more change to anything.”

## Scope (strict)

**Only** undo `MOB-APPLY-PANEL-RESTORE-NO-BLACK-SIDES` (cover).

| File | Change |
|------|--------|
| `public/index.html` | Panel ZLM `object-fit: contain` again; cache `?v=20260719-undo-cover-pass` |
| `public/js/video-wall.js` | Removed `objectFit: 'cover'` from wall softAttach |
| `public/js/live-player-factory.js` | Comment only — default remain contain |

**Not touched:** bank 5+3, bank B size, pin, Call/PTT/SOS, server, Firmware Gold cores.

## Operator

Hard refresh → wall live → pass/fail.  
Cover crop FAIL must be gone. This is the one chance.
