# MOB-APPLIED — WVP Socket.IO bridge + TCP signaling (2026-07-19)

**APPLY:** `MOB-APPLY-WVP-BACKEND-TRANSLATION-AND-TCP`

## Boundaries

| Forbidden | Done? |
|-----------|--------|
| Frontend (`video-wall.js`, `live-player-factory.js`, layouts) | **Not touched** |
| Legacy Fleet **video** SIP INVITE | **Not used** for ZLM/WVP talk path |

## Execution 1 — Translation bridge (backend)

| Direction | Source | ME8 action | Socket.IO |
|-----------|--------|------------|-----------|
| Inbound SOS | Proxy `:5060` SIP MESSAGE Alarm | `POST /api/lab/wvp/device-alarm` → `raiseDeviceAlarm` | **`sos-alarm`** |
| Inbound cold PTT | Proxy audio-only INVITE | `POST /api/lab/wvp/device-ptt-rx` | **`ptt-rx-state`** |
| Outbound group PTT | `ptt-start` `{ camIds: [] }` | **Every** camId → WVP `/api/play/broadcast/...` (audio) in parallel; Fleet TCP PCM kept when online | **`ptt-talk-state`** |

No WVP Redis client — proxy intercept + REST remain the bridge.

## Execution 2 — TCP transport

| Layer | Change |
|-------|--------|
| `application-modern.yml` | `register-time-interval: 60`, `sip-cache-server-connections: true`, `register-keep-int-dialog: true`, keepalive TTL raised |
| `docker-compose.wvp.yml` | Host **`15061/udp` + `15061/tcp`** (unchanged maps; confirmed for register tcp) |
| Host proxy | Already **UDP+TCP** on `:5060` |
| Fleet SIP `:5062` | `sip.start({ udp: true, tcp: true })` explicit |

## Files

- `lib/wvpGb28181Bridge.js` — fan-out every `camId`
- `server.js` — Fleet SIP TCP+UDP
- `docker/wvp/wvp-config/application-modern.yml` — TCP/keepalive
- `docker/wvp/docker-compose.wvp.yml` — comment
- `scripts/wvp-sip-lan-proxy.js` — quiet missing sync helper

## You

1. Restart ME8 (`RESTART-FLEET.bat`) — Fleet SIP TCP flag.  
2. Restart WVP container (yml mount): `docker restart me8-wvp`  
3. Bounce proxy if you want the quieter sync (optional): stop old node proxy + start with `WVP_SIP_PROXY_LISTEN=5060`.  
4. BWC stay **register tcp** → PC **:5060**.  
5. Prove: cold SOS banner; group PTT server log `everyCamId: true` / `wvpBroadcast`.
