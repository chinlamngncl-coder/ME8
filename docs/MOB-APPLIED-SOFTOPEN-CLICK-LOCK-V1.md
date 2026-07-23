# MOB-APPLIED: mob-softopen-click-lock-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**Prior disc:** `docs/MOB-DISC-GOOGLE-SOFTOPEN-UI-RACE-ZOMBIE-20260717.md` (Step A)

## Mandate

One Soft Open click per cam until prove or fail. No double-click race that starts two fetches / two overlays.

## What changed

| Piece | Change |
|-------|--------|
| `beginSoftOpenClickLock` / `endSoftOpenClickLock` | Track camId; disable wall + pin Play (`disabled` + `aria-busy`) |
| `attachCanvasPlayerWvpSoftOpen` | Lock on entry; ignore if already locked; unlock on prove / fail / stale abort |
| `softOpenPlayerFailed` / recover exhausted / `stopSlot` | Unlock |
| `playSlot` / wall Play click / pin Play / `assignCamToSlot` | No-op while Soft Open locked |
| Loading | Existing streaming wait overlay (spinner/label) stays as Step A wait UI |
| Cache | `video-wall.js?v=20260717-click-lock` |

## Pass / fail

1. Hard refresh once.  
2. Soft Open: mash **Play** twice fast on Chin wall (or pin).

| Pass | Fail |
|------|------|
| Second click ignored; one Soft Open; Play disabled until Live / error | Two broker fetches / blank race / need Stop+refresh |
| After Live, Play hidden/normal again; Stop still works | Play stuck disabled forever |

## One line

**Soft Open: lock Play until prove/fail — one click, one session.**
