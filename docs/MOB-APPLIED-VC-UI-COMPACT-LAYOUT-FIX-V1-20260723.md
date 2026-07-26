# MOB APPLIED — VC-UI-COMPACT-LAYOUT-FIX-V1

**Date:** 2026-07-23  
**EXECUTE:** `MOB-EXECUTE-VC-UI-COMPACT-LAYOUT-FIX-V1`  
**Status:** APPLIED — **CORRECTED** by `MOB-FIX-VC-LAYOUT-INVERSION-CORRECTION` (2026-07-24). Dense top chrome kept; bottom-strip stage collapse reversed.

---

## Problem

In-meeting VC looked sparse and broken: oversized top chrome (rooms / End Room / Mute / floor / selectors), a large empty middle band, and bottom participant tiles stretching full width instead of compact 16:9.

## What changed

| Area | Fix |
|------|-----|
| Top chrome | Smaller room cards, buttons, floor pill, selects, hub tabs, panel padding when `vc-in-meeting` |
| Stage fill | Stage flexes into remaining height (`flex: 1 1 auto`, `min-height: 0`) so middle is video, not blank gap |
| Operations strip | Bottom gallery is `flex: 0 0 auto` (not stretch); tiles fixed **16:9** (~160px), not `height: 100%` / full width |
| Speaker strip | Filmstrip tiles **16:9** |
| Spotlight video | Fills stage pane; `<video>` / `<img>` use `object-fit: contain` (no distort) |
| Dock | Tighter padding / 10px controls |

## Files

- `public/index.html` (CSS only under VC selectors)
- `public/js/vc-lazy.js` (cache bust)
- `scripts/verify-vc-ui-compact-layout-fix-v1.js`
- `package.json` → `npm run verify:vc-ui-compact`

**Cache:** `?v=20260723-vc-ui-compact-layout-fix-v1`

## Not touched

`conference-layout.js` remount logic, hub join/token, WVP, Ops wall, APK.

## Operator smoke

1. Hard refresh (Ctrl+F5).  
2. Video Conference → Join room.  
3. **PASS look:** top bar dense (not giant cards); video stage fills middle; bottom strip tiles are small 16:9 (not a full-width stretched bar); no huge empty band between controls and video.  
4. Speaker / Operations / Focus still switch; Mic / Leave still work.

Say **PASS** or **FAIL** (what still looks wrong).
