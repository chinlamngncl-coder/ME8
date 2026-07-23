# MOB-APPLIED: mob-softopen-reopen-no-pin-fan-storm-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**Prior:** KK pin popup jumped up on Soft Open keepalive reopen (layout/fan storm, not GPS marker)

## Mandate

Soft Open wall recover / keepalive reopen must not rebuild pin popup HTML, expand, or refresh fan/dock layout.

## What changed

| Piece | Change |
|-------|--------|
| `quietSoftOpenPinResync` | Reopen prove: one `syncMapPopupPlayer` if pin already open + not minimized + not user-stopped |
| Soft Open `onProven` | **First** open: keep `ensureSoftOpenPinLiveChrome` + expand + staggered sync |
| Soft Open `onProven` | **Reopen:** quiet path only — no ensure / expand / triple sync |
| `stopPinLive` | Dropped `refreshOpenPinPopups` (same fan-jump class) |
| Cache | `video-wall.js?v=20260717-reopen-no-fan` |

## Out of scope (later)

- Kill descriptor reopen storm / in-player recover (`mob-softopen-kill-reopen-storm-v1`)
- Weak-signal OSD
- ZLM `continue_push_ms`

## Pass / fail

1. Hard refresh once.  
2. Soft Open Chin + KK; both pins open (colocated OK).  
3. Wait for a wall **Reconnecting…** / reopen (or soak until keepalive fires).

| Pass | Fail |
|------|------|
| Pin popup **stays put** (no jump up / fan reset) | Popup jumps / restacks on reopen |
| Wall recovers; expanded pin remirrors quietly | Pin rebuilds offline→live chrome every reopen |
| Pin Stop still spares wall (prior MOB) | Pin Stop kills panel again |

## One line

**Soft Open reopen = wall recover + quiet pin remirror; no pin chrome rebuild / fan refresh.**
