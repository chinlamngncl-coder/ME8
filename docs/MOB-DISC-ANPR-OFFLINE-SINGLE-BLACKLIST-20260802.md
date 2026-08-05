# MOB-DISC — ANPR Offline: single blacklist panel (2026-08-02)

## Mandate

CRITICAL FRONTEND: Offline tab UI & single blacklist panel.  
Named `offline.html` / `offline.js` do not exist — applied to Offline sub-panel in `public/index.html`, `public/css/global.css`, `public/js/anpr-offline-match.js`, and Offline paths in `public/js/anpr-live-watch.js`.

## Applied

### [1] Remove duplicate watchlist banner

- Deleted `#critical-alerts-container-offline` from Offline right rail.
- Offline right rail = **Recent Plates only** (+ Clear UI).

### [2] Bottom blacklist = sole hit SOT

- `.ax-anpr-offline-layout` → `height: calc(100vh - 80px); overflow: hidden`.
- `#blacklist-hits-container` → `h-36` (9rem), `shrink-0`, `w-full`, `overflow-x: auto`.
- Empty → 3 red-dashed **Awaiting Hit** skeletons (`min-width: 260px`).
- Offline watchlist hits route to `pushHitSlot` only (not rail critical banner).

### [3] Offline Recent Plates

- Cap 50, 2-col grid, dashed skeletons when empty, Clear UI clears Recent Plates only (blacklist strip kept separate).

## Operator

Hard refresh dashboard (`?v=20260802-offline-single-blacklist-v1`). Open Analytics → ANPR → Offline Match.
