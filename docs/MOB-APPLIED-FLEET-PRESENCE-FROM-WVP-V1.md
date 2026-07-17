# MOB-APPLIED: mob-fleet-presence-from-wvp-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**Paper:** `MOB-DISC-BWC-WVP-ONLINE-FLEET-BLIND.md`

## Why

One-row BWC registers only to **WVP :5060**. Fleet SIP **:5062** never gets REGISTER → Axiom map/fleet stayed offline while WVP showed connected.

**Ports stay as set.** This MOB does **not** change 5060 / 5062 / BWC typing.

## Design (stable)

| Piece | Role |
|-------|------|
| BWC | One IP · **5060** · WVP platform (unchanged) |
| Host proxy | **5060** → WVP |
| Fleet SIP | **5062** (YDT / later) |
| Presence | Fleet polls WVP device list every ~8s → `fleetRegistry.markOnline` |

Offline still via existing keepalive stale timer when WVP stops reporting online (poll stops refreshing `lastSeen`).

## Files

- `lib/wvpFleetPresence.js` (new)
- `server.js` — start presence after telemetry intervals
- `.env` — `FM_WVP_FLEET_PRESENCE=1`

Off switch: `FM_WVP_FLEET_PRESENCE=0`

## Operator

1. Restart Fleet only (no BWC port change).  
2. Hard refresh dashboard.  
3. Within ~8–15s Chin/kk should show **online** while still on WVP.

## One line

**Axiom fleet online follows WVP — no second BWC address, ports unchanged.**
