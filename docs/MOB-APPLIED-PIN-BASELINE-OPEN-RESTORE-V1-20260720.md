# MOB APPLIED — PIN-BASELINE-OPEN-RESTORE-V1

**Date:** 2026-07-20  
**Status:** APPLIED — operator test pending  
**Disc:** `MOB-DISC-PIN-BASELINE-OPEN-RESTORE-AGENT-WRONG-20260720.md`  
**Undoes:** wrong gates from `PIN-FOCUSED-OPEN-V1`  
**Keeps:** WVP/ZLM wall FLV + pin mirror / chase (player only)

---

## Restored (Firmware Gold behavior)

| Piece | Restored |
|-------|----------|
| `ensurePopupsForLiveWallCams` | `openPopup: true` for every live wall cam + pin video |
| `focusMapPinQuiet` | Calls `ensurePopupsForLiveWallCams` again (multi-pin) |
| Wall FLV / classic prove when ≥2 live | `ensurePopupsForLiveWallCams` + **one** dock |
| Open All end | Dock again at 1200ms (pre-FOCUSED) |

**Not redesigned:** Fit pins / `assignColocatedPinPopupDocks` math.  
**Still WVP:** wall `attachFlvPrimary` + pin `startMapMirrorFromWall` video mirror.

Cache: `video-wall.js?v=20260720-pin-baseline-open-restore-v1`

---

## Operator test (hard refresh once — no bat)

1. Ctrl+Shift+R  
2. Soft Open / play wall Live (1–2 cams)  
3. Expect: map pins **auto-open** for live wall cams (baseline)  
4. Pin **Call** / PTT / Stop — work again  
5. Pin picture still mirrors wall FLV  

| PASS | FAIL |
|------|------|
| Pins open with wall Live; Call works | Pins stay closed / Call dead |
| Picture on pin | Black pin |

---

## Next

Harm plan phase **8** after PASS — or you name the next MOB.
