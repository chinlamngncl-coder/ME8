# MOB-APPLIED: mob-softopen-zombie-destroy-v1 + mob-softopen-attach-generation-v1

**Date:** 2026-07-17  
**Status:** APPLIED (both named MOBs)  
**Prior disc:** `docs/MOB-DISC-GOOGLE-SOFTOPEN-UI-RACE-ZOMBIE-20260717.md`

## Mandate

1. **Zombie destroy** — Stop/fail/re-attach must `destroy()` Soft Open mpegts, clear Map, **remove** overlay `<video>`/OSD from DOM (no hidden background fetchers).  
2. **Attach generation** — Each Soft Open open bumps a per-slot generation; stale descriptor fetch / prove / fail callbacks must no-op.

## What changed

| Piece | Change |
|-------|--------|
| `zombieDestroySoftOpenWall` | Destroy handle → delete Map → remove `.me8-zlm-soft-overlay` + buffering OSD |
| `destroyZlmWallOverlay` | Delegates to zombie destroy |
| `destroyZlmPinOverlay` | Also strips leftover Soft Open video DOM on pin |
| `softOpenAttachGen` + `bumpSoftOpenGeneration` | Per wall slot generation |
| `attachCanvasPlayerWvpSoftOpen` | Capture `gen`; gate fetch/attach/prove/fail/buffering on `softOpenGenerationMatches` |
| `destroyPlayer` / `softOpenPlayerFailed` | Bump gen + zombie destroy (invalidates in-flight) |
| Soft-upgrade fail | Zombie destroy (not Map-delete only) |
| Cache | `video-wall.js?v=20260717-zombie-gen` |

## Pass / fail

1. Hard refresh once.  
2. Soft Open Chin → Stop → Soft Open again (repeat 3×).  
3. Soft Open → mash Play / Stop quickly once.

| Pass | Fail |
|------|------|
| Clean Live each time; DevTools: no orphan Soft Open `<video>` after Stop | Blank panel needing refresh; multiple `.me8-zlm-soft-overlay` in stage |
| Fast Stop during Connecting does not attach later | Stale fetch paints after Stop |
| Click-lock + kill-reopen-storm still OK | Play stuck disabled / broker reopen storm returns |

## One line

**Soft Open: zombie-free destroy + generation so stale attach cannot win.**
