# MOB DISC — `mob-map-pin-fan-2`: only 2 cams, or most of the issue?

**Status:** Applied fan-2; **CHECKPOINT FAIL** follow-up 2026-07-10 — always fan n=2 (dock cleared 12px-overlap while panels still looked stacked)  
**Search:** `autoFanStackedPopups`, `fan-2`, `Open All stack`, `fallback`, `Stacked nearby`  
**Parent:** `MOB-DISC-MAP-PIN-STACK-STILL-BROKEN.md`

---

## FAIL root cause

HUD showed **Stacked nearby (2)** → `clusterPopupsOverlap` false → first fan MOB **bailed** and never pushed ±420.  
Dock left/right was “good enough” for the 12px test; panels still sat piled in the map center.

## Fix (same MOB family, one pass)

- n=2 → **always** fan (420, then 520 if still too close)
- n≥3 → fan on overlap **or** center/gap “too close”
- File: `public/index.html` only

## Fallback

Revert `autoFanStackedPopups` / `clusterPopupsNeedFan` block; hard refresh. Drag chips still work.
