# MOB APPLIED — bwc-stop-never-auto-callback

**Date:** 2026-07-17  
**APPLY:** Operator: “please Fix BWC stop so it never auto call-backs”  
**Design:** Stopped by BWC = toilet/privacy end → HQ may **PTT**; **Play / Call** only when wearer ready — **no** auto re-invite.

## Log proof (before fix)

```
23:31:38 pool remote bye | camId …0008 | dashboardActive: true
23:31:42 pool invite sending | camId …0008     ← ~4s auto call-back
23:31:47 pool remote bye | dashboardActive: true
```

Root: `onRemoteBye` kept `dashboardActive: true` + UI cleared “Stopped by BWC” on pin attach / auto play → new `start-video`.

## Changes

| File | Change |
|------|--------|
| `lib/liveStreamPool.js` | `onRemoteBye` → `dashboardActive=false`, clear pending invite + cooldown; log `device_bye_clear_watching` |
| `public/js/video-wall.js` | Gate invite while `bwcStoppedCams`; no clear on `attachMapPopupPlayer`; resume only `userPlay` / SOS / Open All / wall Play; emit `stop-video` after overlay without wiping chrome |
| `public/index.html` | Cache bust `video-wall.js?v=20260717-bwc-stop-no-callback` |

## Not touched

- CallMic / mute sticky (see mute DISC)  
- Soft Open player storm  
- Firmware Gold pin-mirror attach path beyond BWC-stop gates  

## Operator

1. **Restart Fleet** (pool change is server-side)  
2. Hard refresh `http://192.168.1.38:3988`  
3. Chin Live → open panel → on **BWC** stop live  
4. Expect: **Stopped by BWC** stays; **no** video return by itself for ≥30s  
5. PTT still OK; **Play** / wall play should resume when you click  

Reply: BWC stop no call-back **PASS** / **FAIL**. In fail case, paste any new `pool remote bye` / `pool invite sending` lines.
