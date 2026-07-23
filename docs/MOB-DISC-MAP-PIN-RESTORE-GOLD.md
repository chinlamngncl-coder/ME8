# MOB DISC — Map pin restore firmware-gold slice (APPLIED)

**MOB:** `mob-map-pin-restore-firmware-gold-slice` — **APPLIED** 2026-07-10  
**File:** `public/index.html` only (pin layout slice)  
**Source:** `baseline/2026-07-06-me8-firmware-gold/public/index.html`  
**Kept:** FR offline video, enroll cropper, Analytics nav, watchlist, etc.

---

## Removed (failed experiments)

| Experiment | Gone |
|------------|------|
| `PIN_DOCK_PAIR_*` dock-gap | Yes |
| n=2 overlap rescue / pushX | Yes |
| 900 ms re-rescue timeout | Yes |
| Marker spread min 88 for n=2 | Back to gold `max(58, …)` |

## Restored (gold behavior)

| Piece | Gold |
|-------|------|
| `autoFanStackedPopups` | Early `return` when `cluster.length === 2` |
| `_updatePosition` gap / yStagger | `+10` cluster gap · **±22** y for n=2 · `PIN_LABEL_CLEAR` |
| `spreadStableColocatedMarkers` | `distPx = max(58, 38 + n*14)` |
| `assignColocated` timers | 150 ms + 450 ms only |

**Not changed:** `MAX_OPEN_PIN_POPUPS = 8` (post-gold fleet scale; gold was 6). FR UI chrome untouched.

---

## Expectation (honest)

Gold-like Open All: dock L/R beside pins. HUD may still say Overlapping/Stacked nearby for colocated Chin+kk — that is gold UX, not another patch target in this MOB.

---

## Soak

Hard refresh → Open All Chin+kk → confirm no edge-fan / no jump-snap thrash from our experiments → stop all.  
Reply **CHECKPOINT PASS** or **CHECKPOINT FAIL**.
