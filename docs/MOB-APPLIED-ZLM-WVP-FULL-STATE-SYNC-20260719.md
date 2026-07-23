# MOB-APPLIED — ZLM/WVP full state sync (outbound + cold inbound) (2026-07-19)

**APPLY:** `MOB-APPLY-ZLM-WVP-FULL-STATE-SYNC`

## Boundaries

| Forbidden | Done? |
|-----------|--------|
| UI / CSS | **Not touched** |
| HTTPS / WSS / port remap | **Not touched** |
| Legacy Fleet **video** SIP INVITE for ZLM/WVP cold path | **Not used**; WVP Alarm bridge sets `skipFleetVideoPull` |

## Part 1 — Outbound (operator watching ZLM)

1. Soft-attach → Socket.IO emit **`zlm-watch-active`** (dashboard HTTP, **not** 3990).
2. ME8 marks durable ops-live (`zlmLiveWatchByCam` + liveViewers).
3. Unlock payload → Call / PTT live-gate / SOS UI sync.
4. **No Redis write to WVP** — ME8 has no WVP Redis “set live” API; ops-live is in-memory on UbitronC2.

## Part 2 — Inbound cold SOS (hardware on WVP :5060)

| Path | Behavior |
|------|----------|
| Fleet SIP **5062** Alarm MESSAGE | Already → `raiseDeviceAlarm` → `sos-alarm` (unchanged; not gated on video) |
| WVP path **5060** (proxy) Alarm MESSAGE | **New:** proxy mirrors Alarm → `POST /api/lab/wvp/device-alarm` → same `raiseDeviceAlarm` → `sos-alarm` |
| Cold PTT RX | Still `ptt-rx-*` via TCP **29201** — never gated on video INVITE |

WVP Alarm bridge:

- Loopback (or `FM_WVP_ALARM_BRIDGE_TOKEN`) only
- Dedup ~4s
- **Does not** start Fleet video INVITE (avoids 408)

## Files

| File | Change |
|------|--------|
| `public/js/video-wall.js` | Emit `zlm-watch-active` |
| `server.js` | `/api/lab/wvp/device-alarm`; unlock path kept; sos emit notes |
| `lib/deviceAlarm.js` | Emit independent of video; skip Fleet pull for WVP bridge / ops-live |
| `scripts/wvp-sip-lan-proxy.js` | Detect Alarm MESSAGE → ME8 HTTP bridge |
| `public/index.html` | Cache `?v=20260719-zlm-full-sync` |

## You

1. Restart ME8 (`RESTART-FLEET.bat`).
2. Restart **wvp-sip-lan-proxy** (Alarm bridge lives in the proxy process).
3. Hard refresh Ops.
4. Open ZLM live → Call / PTT UI unlock (PTT TX still needs device on **29201**).
5. Cold SOS on a WVP-home cam → Ops SOS banner without prior live / without Fleet video INVITE.
