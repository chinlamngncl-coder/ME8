# MOB-APPLY ANALYTIC-TOAST-DRAGGABLE-V1 — APPLY lock

**Date:** 2026-08-11  
**Status:** APPLIED — operator PASS/FAIL after hard refresh

## Intent

Weapon / FR / ANPR Ack toasts can be dragged (by header) so they do not block live video or map. Position kept in `sessionStorage` for the tab.

## Files

- `public/js/analytic-toast-drag.js` (new) — shared `AnalyticToastDrag.enable`
- `public/js/weapon-alarm.js` — enable on `#wd-weapon-toast`
- `public/js/fr-alarm.js` — route `makeDraggable` through helper (fallback kept)
- `public/js/anpr-live-watch.js` — enable on `#ax-anpr-live-toast`
- `public/index.html` — script before alarm JS; cache `?v=20260811-analytic-toast-draggable-v1`; FR head `cursor: move`
- `public/css/global.css` — weapon toast head drag cursor

## Operator check

1. Hard refresh dashboard.
2. Trigger a Weapon (or FR) Ack toast.
3. Drag by the dark header — toast moves; buttons still click.
4. Refresh tab — toast should reopen near last drag position (same session).
