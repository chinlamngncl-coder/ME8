# MOB-APPLIED: mob-softopen-panel-play-clears-pin-user-stop-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**Prior disc:** `docs/MOB-DISC-SOFTOPEN-PANEL-PLAY-PIN-STUCK-SIGNAL-LOST-20260717.md`

## Mandate

After pin Stop (sticky user-stop), panel **Play** / Soft Open prove must revive pin remirror — clear `pinVideoStoppedByUser` before pin sync.

## What changed

| Piece | Change |
|-------|--------|
| `playSlot` | `clearPinVideoUserStop` before assign / focus |
| `focusMapPinQuiet` | Clear user-stop (wall wants pin live) |
| Soft Open `onProven` | Clear user-stop before ensure/expand/sync pin |
| Cache | `video-wall.js?v=20260717-panel-play-pin` |

Pin Stop still spares Soft Open wall (prior MOB). Flag still blocks auto remirror until panel/Soft Open prove / wall focus.

## Pass / fail

1. Hard refresh. Soft Open Chin.  
2. Pin **Stop live** → panel still live.  
3. Panel **Stop** → panel **Play**.

| Pass | Fail |
|------|------|
| Pin reopens / remirrors Soft Open wall | Pin stays stopped / empty after panel Play |

## Strategy note (not code)

Stable Fleet baselines / Firmware Gold cover **classic** wall+pin+PTT. Soft Open is a **new WVP/ZLM picture path** that reuses pin chrome — regressions here are Soft Open coupling, not “gold pin logic is gone.” Prefer: freeze Soft Open UI genre soon; next spend on **WVP Busy Here / session health / ZLM**, not more UI band-aids. See response / `MOB-DISC-SOFTOPEN-STOP-UI-PATCH-FOCUS-WVP-ZLM-20260717.md`.

## One line

**Panel Play / Soft Open prove clears pin user-stop so pin remirrors again.**
