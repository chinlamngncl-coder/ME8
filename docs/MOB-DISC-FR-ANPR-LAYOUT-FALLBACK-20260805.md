# MOB DISC — FR / ANPR layout fallback (2026-08-05)

## What I see

Your screenshot is **ANPR → Live**:

- Left: Start watch / Stop all / Search BWC / camera list
- Center: **2×2** live tiles
- Right: **Recent Plates** (2×2 awaiting capture)

That 3-column shell is the long-standing ANPR Live layout (`roster | tiles | rail`).

## Honest fact: no exact “last night 10pm” git snapshot

| Time (UTC+8) | What exists |
|--------------|-------------|
| **2026-08-04 ~22:00** | **No commit.** Layout lived only in uncommitted working files. |
| **2026-08-02 01:38** `8fc222e` | Last committed `global.css` + `index.html` (closest git restore point). |
| **Today (Aug 5)** | Bottom-of-file CSS: `EMERGENCY LAYOUT OVERRIDE` + anti-squish (`min-height: 450px` on tiles, `max-height: 250px` on FR watch **and** ANPR left roster). |

So we **cannot** check out a precise 10pm file. We **can** put FR + ANPR layout CSS back to the last known good shell and strip today’s wrapper overrides.

## What broke it (today)

1. **Emergency row-flex** on `.ax-fr-main` / fake `.ax-fr-center` / forced `.ax-fr-right` 320px.
2. **`max-height: 250px` on `#ax-panel-anpr .ax-anpr-live-roster`** — that roster is a **left column**, not a bottom strip. Capping it at 250px squashes ANPR.
3. **`min-height: 450px; flex-shrink: 0` on live tiles** — fights the existing 2×2 / 3×2 grids.

JS firewall / banner quarantine / video controls / backend = **keep**. Layout CSS only.

## Target after restore (both modules)

- **FR Live:** left = 3×2 tiles + BWC roster under tiles; right = Recent (fixed ~300px). No emergency wrappers.
- **ANPR Live:** left roster full height; center 2×2 tiles; right Recent Plates. Same 3-col grid as Jul 31 / Aug 2 (`170px | 1fr | 1.2fr`).

## One next APPLY (recommended)

**`MOB-APPLY FR-ANPR-LAYOUT-RESTORE-PRE-TODAY-V1`**

CSS only (`public/css/global.css` + FR/ANPR layout blocks in `public/index.html` if needed):

1. Delete from `/* --- EMERGENCY LAYOUT OVERRIDE --- */` to end of `global.css` (includes today’s anti-squish append).
2. Restore `#ax-panel-face` / `.ax-fr-main` / `.ax-fr-grid` / `.ax-fr-right` layout rules toward `8fc222e` (no full-file rewrite).
3. Leave ANPR 3-col template in place; do **not** cap left roster at 250px.
4. **Do not touch** `fr-alarm.js`, `fr-offline-video.js`, sidecar, or `server.js`.

## Out of scope

- Ops wall / Command Wall / pin video
- Changing ANPR tile count or plate-list logic
- Git commit / push

## Operator check after APPLY

Hard-refresh once. Pass if:

- ANPR Live still reads left / 2×2 / Recent Plates (roster full height, not a short stub)
- FR Live still reads tiles + BWC under them / Recent on the right
- Offline/Live firewall still holds (JS unchanged)
