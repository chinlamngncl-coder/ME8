# MOB — WVP tile no-mute stall (Opera / Chromium)

**Status:** APPLIED 2026-07-14 — `mob-wvp-tile-nomute-stall`  
**Scope:** `public/js/wvp-lab-tile.js` only. No wall.

## Why

Tiles died ~1–2 min while BWC stayed live. Hard `muted=true` + Chromium/Opera (incl. **private/incognito**) often pauses live readers → ZLM drops **player**; cam push continues.

## Change

- Start **unmuted** at volume **0.01** (Play click = gesture; G.711 still off via `hasAudio: false`)
- If autoplay blocks → mute fallback only then
- Keepalive: every 15s + on tab visible → unstall / `play()` if paused

## You prove (Opera private OK)

1. Hard refresh (cache `?v=20260714-nomute-stall`)
2. Play A + B on lab panel
3. Leave **> 5 min** (can stay on that Opera private tab)
4. Both still picture = **PASS**; dies again = **FAIL** → next `mob-wvp-tile-auto-reopen`
