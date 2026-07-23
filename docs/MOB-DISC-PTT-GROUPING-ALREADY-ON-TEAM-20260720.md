# MOB DISC — PTT grouping already on for all team BWCs

**Date:** 2026-07-20  
**Context:** User: *"all other team BWC please check, i already have this. ptt grouping."*  
**Related:** SOS group PTT — HQ→all PASS; helper field PTT → kk deaf (user report).

---

## What you already have (confirmed in tree)

| Piece | Where | What it does |
|-------|--------|----------------|
| **SOS / FR team build** | `lib/sosResponseTeam.js` | `uniqueCamIds`, `buildTeamPttDevices` (alarm + helpers + HQ row) |
| **Team group push** | `pushPttGroupToTeam` | Pushes same group XML to every cam on the team |
| **WVP-homed delivery** | `lib/wvpPttGroupRelay.js` | Group MESSAGE via `:5060` register peer when handoff on |
| **Fleet path** | `pttServer.pushPttGroupToDevice` | Direct SIP MESSAGE when cam has Fleet contact |
| **SOS banner team** | `POST /api/sos-ptt-team` | One-click team push + `global.activeSosPttTeam` |
| **HQ hold fanout** | `server.js` `beginPttTalk` + `sendPttAudioToDevice` | Operator hold → all `resolvePttTalkCamIds` targets |
| **TX proof (session)** | `group ptt tx proof` logs | Both cams `ok:true` on HQ hold — server path OK |

**Classic Jul-18 baseline:** same `sosResponseTeam` + `handleInboundPttAudio` → dashboard only. No extra field-mesh relay was added in WVP video work.

---

## Product wording vs code path

Ship / lab manuals describe **HQ hold PTT → all checked units hear you** (desk outbound).  
Example: trial-ship manual — *"Press and hold PTT on the alarm officer's wall panel or map pin — all checked units hear you."*

That matches **hub-and-spoke outbound** (HQ → all team BWCs via `:29201` downlink).  
It does **not** promise **field BWC → other field BWC** server relay.

---

## Inbound field PTT (helper → kk)

```
BWC field PTT → :29201 → handleInboundPttAudio → emitPttRxAudio → dashboard WebSocket only
```

- **No** `sendPttAudioToDevice` to other team members on inbound field audio.
- Jul-18 classic `pttServer.js` is identical on this path.
- Group XML (`gtid`, team device list) is pushed to all BWCs — firmware may use it for **platform channel membership**, but the **Node server does not relay field RX to peer BWCs**.

If helper→HQ works but kk does not hear helper, causes to check **before** a new server relay MOB:

1. **Expectation** — product docs target HQ→all on hold, not field mesh.
2. **Firmware / live state** — kk on live video may block or duck PTT RX on device (hardware policy).
3. **Group stale mid-talk** — mitigated by `PTT-HOLD-SKIP-GROUP-REFRESH-DURING-TALK-V1`; re-test cold SOS team then field PTT.
4. **kk PTT session** — `group ptt tx proof` only covers HQ hold; need inbound `rx from field` on kk side during helper talk.

---

## Recommendation

- **Do not redo SOS team / group push** — already Fleet-native and PASS on HQ hold.
- **No MOB-APPLY** for field→field server relay until one more scoped test:
  - SOS team pushed, no HQ hold.
  - Helper hardware PTT 3s — confirm server log `rx from field started` for helper camId.
  - On kk: listen for any PTT RX (not wall audio).
- If server shows helper RX but kk still deaf → **firmware / device live-audio policy**, not missing group XML.
- If user explicitly wants **field→all team** server relay → separate named MOB (`MOB-APPLY-SOS-GROUP-FIELD-RX-RELAY-V1`) — **not** bundled with dashboard warm.

---

## Parked (disc only)

| MOB | When |
|-----|------|
| `MOB-APPLY-SOS-GROUP-FIELD-RX-RELAY-V1` | Only if DISC test proves server must fanout inbound field audio to active SOS team |
| Remove TX proof logging | After group PTT genre PASS |
