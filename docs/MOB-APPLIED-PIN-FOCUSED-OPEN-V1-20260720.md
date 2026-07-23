# MOB APPLIED — PIN-FOCUSED-OPEN-V1

**Date:** 2026-07-20  
**Status:** APPLIED — operator **REJECT** 2026-07-20  
**Reject reason:** Removed **baseline** auto-open pins / broke Call-on-pin — wrong diagnosis of “jump”.  
**Follow-up:** `MOB-DISC-PIN-BASELINE-OPEN-RESTORE-AGENT-WRONG-20260720.md` → `PIN-BASELINE-OPEN-RESTORE-V1`

---

## Goal

Stop pin **jump / auto-open storm**. Keep day‑1 dock helper when **you** open/focus a pin. Wall Live must **not** fan-open every pin or re-dock the map.

---

## Changes

| Before | After |
|--------|--------|
| Wall FLV/classic prove when ≥2 live → `ensurePopupsForLiveWallCams` + `assignColocatedPinPopupDocks` | **Removed** — only `syncMapPopupPlayer` (+ chase) for **that** cam if pin already open |
| `ensurePopupsForLiveWallCams` → `openPopup: true` for every live wall cam | Now `syncOpenPinVideosForLiveWall` — refresh video **only if pin already open** |
| `focusMapPinQuiet` → fan-open all live wall pins | Opens/focuses **that** cam only; one dock pass |
| Open All end → dock twice (immediate + 1200ms) | **One** dock pass after Open All |

**Not touched:** `assignColocatedPinPopupDocks` implementation, Fit pins, slim 8 CSS, FLV mirror player path.

---

## Operator test (hard refresh once — no bat)

1. Ctrl+Shift+R  
2. Soft Open / play 1–2 panels Live  
3. Open **one** map pin yourself  

| PASS | FAIL |
|------|------|
| Pin stays where day‑1 dock puts it / you leave it — no snap-jump storm | Pin jumps around as wall proves |
| Other cams do **not** auto-open pins when wall goes Live | Every live wall cam pops a pin |
| Pin picture still mirrors wall when that pin is open | Black pin (separate — say FAIL pin black) |

---

## Next after PASS

Phase **8:** `WALL-AUDIO-PATH-V1` (or operator names next)
