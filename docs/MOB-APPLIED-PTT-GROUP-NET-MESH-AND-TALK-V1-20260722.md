# MOB-APPLIED — PTT-GROUP-NET-MESH-AND-TALK-V1

**Date:** 2026-07-22  
**APPLY:** `MOB-APPLY PTT-GROUP-NET-MESH-AND-TALK-V1`  
**Also:** remove 1-person group Join (`PTT-GROUP-SELECT-1PLUS-V1` product path)

## What changed

1. **Join needs 2+ BWCs again** — client, server, i18n. One unit alone stays on normal wall/pin 1:1 PTT (no fake “group”).
2. **Hold Group PTT** — after Join, left **PTT Groups** box shows a big press-hold button + “Field units use their PTT button — all hear”. Status: **Radio net · HQ + N**.
3. **HQ → net** — Hold Group PTT (or wall/pin PTT on a joined cam) fans out to the full Joined team.
4. **Field mesh** — existing `lib/pttFieldGroupRelay.js` now **always** arms on successful Join (`setDispatchTeam` even if XML push partially skips). Field PTT from a joined cam → other joined BWCs; HQ still hears via existing RX path; HQ hold preempts field floor.

## Files

| File | Change |
|------|--------|
| `public/index.html` | Hold Group PTT UI + 2+ Join + bind |
| `public/js/video-wall.js` | `resolvePttTalkCamIds` 2+, group hold bind/sync |
| `public/js/dashboard-boot.js` | parity with index |
| `server.js` | Join 2+ + always `setDispatchTeam` |
| `public/locales/*.json` | radioNet / holdTalk / fieldHint / 2+ copy |
| Cache | `video-wall.js?v=20260722-ptt-group-net-mesh-v1` |

## Operator verify

1. Restart Fleet → Ctrl+F5  
2. Tick **only 1** unit → Join stays blocked (“Need 2+”)  
3. Tick **Chin + kk** → **Join** → status **Radio net · HQ + 2** + **Hold Group PTT** appears  
4. Hold **Hold Group PTT** → both BWCs hear HQ  
5. Chin hardware PTT → kk + HQ hear; kk PTT → Chin + HQ  
6. **Ungroup** → Hold button gone; wall PTT = 1:1 again  

**PASS / FAIL:** **PASS** (operator 2026-07-22)
