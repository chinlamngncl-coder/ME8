# MOB-DISC SDK-USIP-PROTOCOL-MAP-V1 — 2026-09-17

**Status:** map only. No SIP-core code in this MOB (`lib/sipServer.js` / `lib/pttServer.js` not named).
**Source:** Paid SDK `usip协议_V1.0.doc` (GB/T 28181-2022 + vendor extras). AES decrypt = last (separate MOB).
**Transport:** SIP `MESSAGE`, `Content-Type: Application/MANSCDP`, XML `<Notify>` / `<Control>` / `<Query>`.

## What Axiom already speaks (keep)

| USIP / GB | Axiom today | Verdict |
|---|---|---|
| REGISTER / keepalive | Fleet SIP + WVP 5061 | Keep both. WVP = video/GPS subscribe. Fleet = ops/PTT/DeviceControl. |
| DeviceControl `RecordCmd` (Record / Stop / Picture / Lock / …) | `lib/deviceControl.js` `udp_once` MESSAGE | Keep. Do not switch to `sip_txn`. |
| Broadcast NOTIFY + INVITE voice | `sendVoiceBroadcastNotify` + SDP audio | Keep. USIP: audio-only SDP = talk; audio+video = live picture. |
| DevStatus NOTIFY (Battery, Signal, VideoRecord, Storage, AppVersion, …) | `lib/telemetryFromXml.js` + `server.js` DevStatus | Keep. New firmware sample matches what we already parse. |
| MobilePosition lat/lon | Fleet `ingestGpsFromSipContent` + WVP poll/NOTIFY | Keep. `0,0` ignored. No last-GPS seed while online. |
| Alarm NOTIFY (SOS / fall) | `lib/alarmFromXml.js` | Keep for **existing** methods (1 / 2 / 5). |
| OnlineStatus / DeviceConfig to device (MsgServer IP) | Fleet MESSAGE toward BWC | Keep for current app WS bind. |

## USIP extras vs Axiom (gaps)

| Extra | USIP fact | Axiom now | Later MOB (not this one) |
|---|---|---|---|
| MobilePosition `<Direction>` `<Speed>` `<Altitude>` | Sample: Direction `189.66` | GPS ingest stores **lat/lon only**. Heading dropped. | Ops pin FOV. Do not invent UDP IMU. Heading is **already in this NOTIFY**. |
| AlarmMethod **105** / **107** | Doc: long-press 5s **close live video**. AlarmType 2. | Unknown alarm → **default SOS**. | **Next SDK code** after this map. Must not look like SOS. |
| FaceUpload HTTP `POST /image/v1/FaceUpload` | multipart JPEG + DeviceID/lat/lon | FR sidecar is local file/live, not this URL | Software→app / FR bind. After USIP desk messages. |
| VideoTag NOTIFY `DeviceTag` | AES key wrap for `-AES` media | Not implemented | **AES last.** Do not copy keys into product or this disc. |
| App MESSAGE desk → phone | Same MANSCDP MESSAGE path | Partial (config/online XML). No USIP chat/command set from this .doc beyond samples above. | Bucket 2: desk→app + VC APK. Need APK docx next, not SIP rewrite now. |

## Locked decisions

1. USIP is **GB28181 plus extras**, not a second video stack. WVP stays. Fleet stays.
2. Do not add cloud MQTT / 60 Hz UDP IMU for pin pointing. Use MobilePosition `Direction` when the camera sends it.
3. Do not treat 105/107 as SOS.
4. AES / VideoTag stays last.
5. No `lib/sipServer.js` / `lib/pttServer.js` edit until the operator names those files on a later APPLY.

## Not in this MOB

Code, AES decrypt, VC APK, ops Hero grid, FOV drawing, DeviceControl list changes.

## Next APPLY (one)

`SDK-USIP-ALARM-NOT-SOS-V1` — map AlarmMethod 105/107 to “stop live / hang up”, not SOS. Files only if named on that APPLY (`lib/alarmFromXml.js` expected).
