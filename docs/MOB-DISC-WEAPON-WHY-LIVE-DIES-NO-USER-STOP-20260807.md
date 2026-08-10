# MOB DISC — WHY Ops live dies without user Stop (locked with KEEP-FAST APPLY)

**Date:** 2026-08-07  
**Tied to APPLY:** `WEAPON-LIVE-KEEP-AND-FAST-OPEN-V1`

## Why (plain)

Server only keeps BWC live while **someone holds a liveViewers ref**.

Ops starts live → holds `ops` ref.  
Weapon used to **only play the FLV URL** — **no** `analytics-weapon` ref.

Then any of these drop the last ref → server **pool stop** (looks like “live died by itself”):

1. Map pin **popup close / idle-release** emits Ops `stop-video`  
2. You **refresh** the page (socket disconnect clears all refs)  
3. Ops tile glitch / navigation that releases Ops without you clicking Stop  

Weapon was not holding the stream, so it could not keep it alive.

## Fix in the APPLY

- Weapon Start watch → `register-viewer-only` surface `analytics-weapon` with **`holdOnly: true`** (no silent INVITE)  
- Weapon Stop → remove **only** that surface; Ops ref still keeps live  
- Health no longer blocks on cold model load; warm in background  

Paper for product: `MOB-DISC-WEAPON-LIVE-KEEP-FAST-OPEN-20260807.md`
