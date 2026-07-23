# MOB-APPLIED — VC-LIVE-LOBBY-COMBINE-V1

**Date:** 2026-07-22  
**APPLY:** `MOB-APPLY VC-LIVE-LOBBY-COMBINE-V1`  
**Disc:** `MOB-DISC-VC-LIVE-LOBBY-COMBINE-20260722.md`

## What changed

1. **Lobby tab removed** from Video Conference nav.  
2. **Live** now shows room Join controls **plus** online-by-group lobby list underneath.  
3. **In meeting:** lobby block hides (stage stays clean).  
4. Old `lobby` panel links redirect to **Live**.

## Files

| File | Change |
|------|--------|
| `public/index.html` | Nav without Lobby; `#vc-live-lobby-block` inside Live; CSS hide in-meeting |
| `public/js/conference-hub.js` | `showPanel('lobby')` → live; Live refresh calls `renderLobby` |
| `public/js/vc-lazy.js` | Cache `conference-hub.js?v=20260722-vc-live-lobby-combine-v1` |
| `public/index.html` | `vc-lazy.js?v=20260722-vc-live-lobby-combine-v1` |

## Operator verify

1. **Ctrl+F5**  
2. Video Conference → nav = **Live | Recordings | Settings** (no Lobby)  
3. Live shows Join row **and** who’s online by group  
4. Join a room → meeting stage; lobby list gone while in meeting  
5. Leave → lobby list back; Recordings + Settings still work  

**PASS / FAIL:** _(operator)_
