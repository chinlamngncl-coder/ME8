# MOB APPLIED — pin-dock-no-top-jam-classic

**Date:** 2026-07-18  
**APPLY:** `MOB-APPLY pin-dock-no-top-jam-classic go`  
**Prior disc:** `MOB-DISC-PIN-GOES-UP-FIX-ONE-BREAK-ANOTHER-20260717.md`

## Mandate (this APPLY only)

Classic Chin pin popup must **not** jam under Fit pins / top chrome or thrash/jump from repeated dock passes.  
**No** mute, CallMic, Soft Open WVP, toilet/BWC-stop, panel-revive (already separate APPLY).

## Root cause (no invent)

1. Tall live pin + `y = pt.y - h/2` → vertical clamp pins popup to **map top** (`tl.y`) → looks “gone up.”  
2. `focusMapPinQuiet` called `assignColocatedPinPopupDocks` **3×** (0 / 250 / 600 ms) → visible jump.

Live dock math is in **`public/index.html`** inline (Ops does **not** load `dashboard-boot.js`).

## What changed

| File | Change |
|------|--------|
| `public/index.html` | Single-pin (non-cluster): if clamp would glue to top edge, **flip dock to bottom** beside marker |
| `public/js/video-wall.js` | `focusMapPinQuiet`: **one** dock pass only (drop delayed 250/600) |
| Cache | `video-wall.js?v=20260718-pin-dock-no-top-jam` |

## Not touched

- Mute sticky  
- Pin Stop → panel revive (prior APPLY)  
- Soft Open reopen / WVP  
- `PIN_DOCK_PAIR_*` gap experiments  
- Firmware Gold mirror attach  

## Operator

1. Hard refresh `http://192.168.1.38:3988` (inline HTML dock needs full refresh)  
2. Chin Live — open pin  
3. Expect: popup **beside** marker (right or below if near top), **not** stuck under Fit pins  
4. Click panel / Stop pin / Live again — pin should not jump to top chrome  

Reply: pin dock **PASS** / **FAIL**.
