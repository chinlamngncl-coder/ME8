# MOB APPLIED — WVP-PRESENCE-REPLAY-GPS-ON-ONLINE-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY WVP-PRESENCE-REPLAY-GPS-ON-ONLINE-V1`  
**Disc:** `docs/MOB-DISC-WVP-PRESENCE-REPLAY-GPS-WHEN-20260723.md`

## What changed

`server.js` — WVP fleet presence `onBecameOnline`:

- If `lastGpsByCam[camId]` exists → emit `gps-update` (same as Fleet REGISTER).
- Else → `maybeQueryGpsForDevice(camId)` once.

No Lock/Unlock SIP change. No FR / Snapshot / Fit pins.

## Operator verify

1. Restart Fleet (or full lab) so this `server.js` loads.
2. Hard refresh dashboard (Ctrl+F5).
3. Confirm pin is on the map.
4. **Lock** BWC → wait until it looks offline.
5. **Unlock** BWC → wait until it comes online via WVP.
6. **PASS:** pin comes back without waiting forever for a new GPS packet.  
   **FAIL:** pin stays gone after unlock + online.

## Out of scope

Turning off WVP handoff; pin video mirror; FR; Snapshot.
