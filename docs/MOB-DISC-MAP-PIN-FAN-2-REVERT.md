# MOB DISC — Pin fan CHECKPOINT FAIL → revert edge fan

**Status:** **REVERTED** 2026-07-10 after total FAIL  
**Search:** `fan-2 revert`, `dock beside pin`, `edge fan`

---

## What went wrong

Forced ±420/±520 pixel fan shoved Chin/kk to the **left and right map edges**.  
That is **not** where panels used to live.

## Where they used to be (correct product)

**Dock layout** — left of pin / right of pin, **next to the colocated markers** in the map center (`PIN_POPUP_DOCK_SLOTS` + `assignColocatedPinPopupDocks`).  
HUD “Stacked nearby” + chip drag is the helper — not screen-edge exile.

## What we did on FAIL

- Removed always-fan / too-close / settle edge push for n=2  
- Restored: **n=2 = dock only** (no pixel fan)  
- n≥3 fan only if rects truly overlap (unchanged role)

## Park

Do **not** re-apply large edge fans. If dock still feels tight, next MOB is **dock gap / stagger beside pins** — not map-edge offsets.

Hard refresh → Clear map pins → Open All — panels should sit **beside the Chin/kk pins** again.
