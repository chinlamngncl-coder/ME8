# MOB-APPLIED — PTT-VISUAL-ALERT-FULLSTACK-V1

**Date:** 2026-07-23  
**Status:** **PASS** (operator 2026-07-23)  
**Apply:** `MOB-APPLY PTT-VISUAL-ALERT-FULLSTACK-V1`

## Plain English

When an officer presses talk on the bodycam, that camera’s **live video tile pulses** (yellow border + “PTT” cue) even if HQ has the tile **muted**. Pulse clears ~0.8s after talk packets stop.

## What was wrong

Backend already detected PTT audio (`dwCMD` 130/4) and emitted `ptt-rx-state`.  
Ops wall **hid** the tile highlight whenever live video was open (`!liveActive`) — so muted live watch never showed who was talking.

## Changes

| Layer | Change |
|-------|--------|
| `lib/pttServer.js` | Idle clear debounce **450 → 800 ms** |
| `server.js` | Also emit `ptt_state { deviceId, camId, active }` (keeps `ptt-rx-state`) |
| `public/js/video-wall.js` | Tile class `ptt-incoming-alert` while field talking — **including live slots**; map pin outline too |
| `public/js/command-wall.js` | Same class on CW cells |
| `public/index.html` | High-vis pulse CSS + cache bust |

## Not changed

- PTT audio routing / recording  
- SIP invite / call logic  
- Settings UI  
- Auto-unmute (dispatcher still chooses)

## Verify

```bash
npm run verify:ptt-visual-alert
```

## Operator check

1. Restart server (debounce change is server-side). Hard refresh (Ctrl+F5).  
2. Open a live tile; keep it muted.  
3. Press PTT on that BWC → **that** tile pulses (yellow + PTT badge).  
4. Release → pulse clears within ~1s.  
5. Other tiles stay quiet. Talk/listen still works.

**Operator result:** **PASS** (2026-07-23).
