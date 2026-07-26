# MOB-APPLIED — VC-EMPTY-STATES-AND-LOBBY-V1

**Date:** 2026-07-24  
**APPLY:** `MOB-APPLY-VC-EMPTY-STATES-AND-LOBBY-V1`

## Problem

`.vc-stage.vc-client-v1 { display: flex }` beat the HTML `hidden` attribute, so the black stage + bottom dock stayed visible in the **lobby** (pre-join). After join with no tiles, the stage was a solid black void.

## Fix

1. **Lobby:** `#vc-stage[hidden] { display: none !important }` + `is-lobby` / not-in-meeting guards. Stage and dock fully gone until join. Top room picker / host tools / Active Personnel stay as a clean control panel.
2. **Join:** Stamp `vc-in-meeting` before `lay.show()` so lobby CSS cannot hide the stage mid-connect.
3. **Empty room:** `syncEmptyStageState()` — when in room and `tileCount === 0`, show `.empty-stage-placeholder` (“ROOM ACTIVE” / waiting copy), navy/transparent stage (not `#000`). Class `vc-has-streams` only when tiles exist (black media bg then).
4. **Dock:** Lives inside `#vc-stage` — hidden with stage in lobby; visible after join (Mic / Cam / layouts / Leave).

## Files

- `public/js/conference-layout.js` — empty-state sync
- `public/js/conference-hub.js` — `is-lobby`, `stage.hidden`, early meeting chrome
- `public/index.html` — CSS + placeholder markup
- `public/locales/en.json`, `zh.json`
- `public/js/vc-lazy.js` — `?v=20260724-vc-empty-states-lobby-v1`
- `scripts/verify-vc-empty-states-and-lobby-v1.js`

## Operator check

1. Open VC → **Ctrl+F5** (do not join yet).
2. PASS lobby: no giant black block, no Mic/Cam/layout dock — only room cards / controls / personnel.
3. Join a room with no other streams yet.
4. PASS empty: “ROOM ACTIVE” / waiting text (not a black rectangle); dock visible.
5. When a camera/BWC tile appears, placeholder goes away and video uses black tile chrome.

## Verify

```text
node scripts/verify-vc-empty-states-and-lobby-v1.js
```
