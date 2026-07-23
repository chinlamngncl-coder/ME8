# MOB-APPLIED — Master-Gateway event bus (revert SIP remarry) 2026-07-20

**APPLY:** `MOB-ARCH-REVERT-AND-UNIFY-EVENT-BUS`  
**Frontend:** not touched  

## Architecture shift (acknowledged)

| Role | System |
|------|--------|
| **Dumb media gateway** | WVP + pass-through SIP proxy (:5060 → :15061) + ZLM video |
| **Master / brain** | Fleet (UbitronC2) — existing `deviceAlarm`, PTT RX state, etc. |
| **Event bus** | Proxy **publishes** (HTTP) → `POST /api/lab/wvp/events` (IP whitelist, no JWT) → `lib/wvpEventBus.js` → existing handlers |
| **Video** | Fleet INVITE **lobotomy stays** (`shouldLobotomizeFleetVideoInvite`) |

Abandoned: Layer-7 SIP split / Alarm MESSAGE replace → Fleet :5062 (`FM_COLD_SOS_REMARRY_5062`).

## Phases done

### Phase 1 — Revert proxy hacks
- Removed remarry / inspect-and-reroute-to-5062 from `scripts/wvp-sip-lan-proxy.js`
- Proxy is dumb pass-through again (+ side-channel publish to event bus)
- `.env`: removed `FM_COLD_SOS_REMARRY_5062` / `FM_COLD_SOS_FLEET_SIP`
- `START-WVP-LAB.ps1`: remarry env pass-through removed

### Phase 2 — Global event bus (webhook, not Redis)
- Unified route: `POST /api/lab/wvp/events` before `requireDashboardAuth`
- Trust: loopback / `FM_WVP_WEBHOOK_TRUSTED_IPS` (+ optional bridge token)
- Redis Pub/Sub not required for this wave — Docker Redis stays WVP-internal; Fleet uses secured webhook bus

### Phase 3 — Fleet native logic
- `lib/wvpEventBus.js` `ingest()` → `raiseDeviceAlarm` / `emitPttRxState` / `touchDeviceOnline`
- Legacy `/device-alarm` + `/device-ptt-rx` still work (same ingest)
- `lib/wvpWebhooks.js` = thin shim → event bus

### Phase 4 — Video lobotomy preserved
- No change undoing `wvp_fleet_invite_lobotomy` / stop immediate path

## Operator check
1. Live Chin still OK (WVP/ZLM).  
2. Cold SOS: press button → look for banner; agent checks `event-bus alarm` / `wvp event-bus alarm → fleet handlers`.  

## Supersedes
`MOB-APPLY-COLD-SOS-PROXY-REMARRY-5062` (SIP split) — reverted.
