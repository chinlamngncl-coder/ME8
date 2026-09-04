# MOB-DISC WVP-FLV-UPSTREAM-EOF-12S-V1 — 2026-09-04

**Status:** **APPLIED 2026-09-04** (`server.js` only: `fastStatusPollAllowedForCam` guard on `pin-open` / `select-device`; `stopFastStatusPolling(camId,'wvp_stream')` when a WVP handoff start-video arrives; classic pool path unchanged). Operator PASS pending — restart required.
**Symptom:** during SOS the live tile flashes every ~10–20 s; HQ clips are 10–20 s long; Investigation shows many blue slivers.

## Evidence chain (20:41:50–20:44:52, cam …0008)

| Time | Layer | Line |
|---|---|---|
| 20:41:52.5 | Fleet | `device alarm raised` → dashboard opens pin → **`fast status poll started reason:pin-open intervalMs:2000 windowMs:180000`** |
| 20:41:52 → 20:44:52 | Fleet | `device status query sending` **64 / min** to the BWC (DeviceStatus direct + target every 2 s). Baseline before SOS: 4 / min. |
| 20:41:54.6 | ZLM | BWC RTP/TCP session opens (`RtpSession 172.21.0.1:40204`), stream registers 20:41:55.9 |
| 20:42:15.050 | ZLM | **`RtpSession on err: 1(end of file)`** — the BWC closed its RTP TCP connection (FIN). Stream unregistered. 5 FLV readers (4 tiles + ffmpeg) get `rtmp ring buffer detached`. |
| 20:42:15.070 | WVP | reacts to unregister → sends BYE to device |
| 20:42:17.2 | WVP | player asks again → `stream not found` → auto INVITE → ACK 17.46 |
| 20:42:18.3 | WVP | **BWC sends BYE** (`ByeRequestProcessor … PLAY`) |
| 20:42:22.9 → 24.5 → 27.2 | WVP/ZLM | INVITE → publish → **EOF after 2.4 s** → BYE |
| 20:42:29.4 → 20:42:43.1 | WVP/ZLM | INVITE → publish → EOF after 14 s |
| 20:44:52.6 | Fleet | `fast status poll stopped` (180 s window) |

Nobody on the server side closes the stream: Fleet sent no BYE, WVP's BYEs are reactions, ZLM reports EOF from the device. **The BWC itself drops its media session (RTP FIN + SIP BYE) repeatedly while it is being polled with a SIP MESSAGE every second.** Also visible: `Relative stamp changed` every ~3 s on ZLM — the BWC's clock jitters under load.

## Root cause (high confidence)

`startFastStatusPolling` (server.js ~L17691) fires 2 × `DeviceStatus` MESSAGE every 2 s for 3 minutes. It is guarded on the **start-video** path — `if (!wvpHandoffStart) startFastStatusPolling(camId, 'start-video')` (L16441) — someone already learned that fast poll + WVP stream do not mix. The **`pin-open`** (L16061) and **`select-device`** (L16070) paths have **no such guard**, and SOS raise always opens the pin. Low-end GB28181 BWC SIP stack + 1 Hz MESSAGE + PS/RTP encoder → media session collapse.

Why it looked like "SOS cuts video": SOS is the only path that opens the pin automatically.

## Fix (one MOB, `server.js` only, ~6 lines)

1. `pin-open` and `select-device`: same guard as start-video — skip `startFastStatusPolling` when the cam is on WVP handoff (`wvpVideoHandoff.isActive(camId)` or handoff enabled for BWC).
2. When a WVP handoff stream **starts** for a cam, stop any running fast poll for it (`fastStatusPollByCam` clear + log `fast status poll stopped reason:wvp_stream`).
3. Keep fast poll for the classic pool path (still needed for record/battery chips there).

Not touched: `wvpVideoHandoff.js`, ZLM/WVP config, `liveCapture.js`, PTT/SIP cores.

## Proof before code (operator, no edit, reversible)

Set in `.env`: `FM_BWC_FAST_STATUS_POLL_MS=60000` → restart → press SOS → watch tile 2 minutes.
Stable, no flashing, one long blue clip → root cause confirmed → `MOB-APPLY WVP-FLV-UPSTREAM-EOF-12S-V1`. Remove the env line after the MOB.

## PASS after MOB

- SOS raise → tile stays live 2+ min, no flashing.
- Log: no `fast status poll started reason:pin-open` for a WVP cam; `device status query sending` back to ≤ 6 / min.
- ZLM log: no `RtpSession … end of file` while SOS open.
- Investigation: one continuous blue clip per SOS (segment restart from 14b becomes the rare fallback, not the norm).

## Side effects to accept

Battery / record-state chips on the pin refresh slower for WVP cams (regular poll cadence). Acceptable — video continuity wins.
