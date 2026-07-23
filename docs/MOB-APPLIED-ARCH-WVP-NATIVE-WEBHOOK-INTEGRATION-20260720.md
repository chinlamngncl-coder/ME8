# MOB-APPLIED — WVP native webhook + Master brain (2026-07-20)

**APPLY:** `MOB-ARCH-WVP-NATIVE-WEBHOOK-INTEGRATION`  
**Also covers confirm of:** `MOB-ARCH-REVERT-AND-UNIFY-EVENT-BUS`  
**Frontend:** untouched  

## Master plan (acknowledged)

| Role | Job |
|------|-----|
| **WVP** | Sole GB28181 SIP + ZLM video gateway |
| **SIP proxy** | Dumb pass-through :5060→:15061 — **no** Alarm→:5062 SIP split |
| **Fleet** | Master brain — SOS/PTT business logic |
| **HTTP event bus** | Gateway → Master (`POST /api/lab/wvp/events`, IP whitelist, no JWT) |
| **Video** | Fleet video INVITE lobotomy stays |

---

## Phase confirmations

### Phase 1 — Revert proxy SIP split — **DONE**
- `FM_COLD_SOS_REMARRY_5062` **absent** from `.env`
- No Alarm MESSAGE re-route to Fleet :5062 in `scripts/wvp-sip-lan-proxy.js`
- SIP bytes stay on WVP path (fixes 408 class fight from dual SIP homes)

### Phase 2 — Webhook 401 / inbound — **DONE**
- Route: `/api/lab/wvp/events` (+ legacy `/device-alarm`, `/device-ptt-rx`)
- Module: `lib/wvpEventBus.js` mounted **before** `requireDashboardAuth`
- Auth: IP whitelist / loopback (+ optional bridge token) — **not** session JWT
- Maps → `deviceAlarm.raiseDeviceAlarm` → `sos-alarm` Socket.IO  
- Smoke earlier: HTTP 200 on `POST /api/lab/wvp/events`

*Note:* Stock WVP ZLM hooks are WVP↔ZLM, not third-party. Gateway publishes alarms to Fleet event bus over HTTP (side-channel). That is **not** Layer-7 SIP remarry.

### Phase 3 — Fleet video lobotomy — **DONE** (unchanged)
- `shouldLobotomizeFleetVideoInvite` — no Fleet :5062 video INVITE for WVP-lab BWCs
- Stop: `pool stop immediate` / skip `invite_in_flight` deferral for those cams

### Phase 4 — Outbound PTT via WVP REST — **DONE**
- `ptt-start` → `wvpGb28181Bridge.fanOutPttStartViaWvp` → `GET /api/play/broadcast/...`
- **No** Fleet SIP INVITE for talk (`inviteVideo: false`)
- Fleet TCP **29201** still carries PCM when device is PTT-online
- Stop → `/api/play/broadcast/stop/...`

---

## Files (this wave polish)
- `scripts/wvp-sip-lan-proxy.js` — arch comments; dumb SIP + HTTP event publish
- `lib/wvpGb28181Bridge.js` / `server.js` — PTT REST wording
- Prior wave: `lib/wvpEventBus.js`, lobotomy in `server.js`

## Operator
1. Live still OK.  
2. Cold SOS button → banner (event-bus path).  
3. Pin PTT → expect WVP broadcast log, not Fleet INVITE/408.
