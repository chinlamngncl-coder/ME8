# MOB DISC — Map pin n=2 overlap rescue (snap-back) 2026-07-10

**MOB:** `mob-map-pin-pair-overlap-rescue`  
**File:** `public/index.html`  
**Trigger:** Dock-gap MOB — panels jump apart once, then **stack back** (CHECKPOINT FAIL).

---

## Cause

1. Dock L/R (+ gap) paints briefly.  
2. Re-layout / video size / map **clamp** collapses rects.  
3. `autoFanStackedPopups` **returned early for n=2** → no rescue → stays stacked.  
4. `assignColocated` clears non-user `pinPopupDragOffset` each pass → any temporary separation dies.

---

## Fix (this MOB)

| Change | Detail |
|--------|--------|
| n=2 overlap rescue | If rects still overlap after dock → modest L/R (+Y) `pinPopupDragOffset` from dock side / measured overlap (cap ~220–260 px) — **not** ±400 edge fan |
| Second bump | If still overlapping after first push, +80 x / +36 y once |
| 900 ms re-pass | After video grows popup, run `updateStackedPopupDragUi` again so rescue re-applies |

User drag still wins (`pinPopupUserMoved` skips auto rescue).

---

## Test

Hard refresh → Open All Chin+kk → panels must **stay** side-by-side (may show Stacked nearby HUD; must not cover each other). Wait ~1s after live video — must not snap back to stack.

Reply **CHECKPOINT PASS** or **CHECKPOINT FAIL**.
