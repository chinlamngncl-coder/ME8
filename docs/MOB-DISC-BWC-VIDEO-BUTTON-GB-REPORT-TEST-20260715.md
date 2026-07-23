# MOB DISC — BWC video button press during video: GB report test

**Date:** 2026-07-15 ~02:40  
**Status:** DISC / log result — no code change  
**Operator:** Played video, pressed physical buttons. Asked to find the SIP/XML Google wants for button pressing during video.

---

## Result

**No Fleet GB28181 XML report was found for the button press.**

Searched `storage/fleet.log` around the test window for:

- `<CmdType>Alarm</CmdType>`
- `<CmdType>DeviceStatus</CmdType>`
- `<CmdType>DevStatus</CmdType>`
- `VideoRecord`
- `AudioRecord`
- `Record`
- `Notify`
- `MESSAGE`

Fleet only shows restart/login/WVP-lab login around the test time. No BWC SIP `MESSAGE` payload arrived on Fleet SIP 5060 after restart.

---

## Exact Fleet Lines Around Test

```text
2026-07-15 02:38:52.138 +08:00 [Web] INFO dashboard listening | {"url":"http://192.168.1.38:3988","folder":"C:\\Users\\user\\Desktop\\Enterprise Mobility\\ME8"}
2026-07-15 02:38:52.139 +08:00 [SIP] INFO telemetry enabled | {"build":"v2","queryOnRegister":true,"gpsPollMs":120000,"statusQueryCooldownMs":90000,"logFile":"C:\\Users\\user\\Desktop\\Enterprise Mobility\\ME8\\storage\\fleet.log"}
2026-07-15 02:38:52.139 +08:00 [SIP] INFO sip listening | {"publicHost":"192.168.1.38","bind":"0.0.0.0","port":5060}
2026-07-15 02:38:52.140 +08:00 [Messaging] INFO websocket listening | {"bind":"0.0.0.0","port":6000,"deviceUrl":"ws://192.168.1.38:6000"}
2026-07-15 02:38:52.141 +08:00 [Media] INFO bridge listening | {"ws":3989,"audioWs":3990,"udpVideo":40130,"udpAudio":40132,"tcp":40131,"ffmpeg":"C:\\Users\\user\\Desktop\\Enterprise Mobility\\ME8\\vendor\\ffmpeg-lgpl\\ffmpeg.exe","ffmpegSource":"vendor-lgpl","ffmpegVersion":"ffmpeg version N-125478-gc6498178bb-20260706 Copyright (c) 2000-2026 the FFmpeg developers","mediaTransport":"udp","logFile":"C:\\Users\\user\\Desktop\\Enterprise Mobility\\ME8\\storage\\fleet.log"}
2026-07-15 02:39:05.072 +08:00 [Web] INFO dashboard login | {"username":"global","role":"super_admin"}
2026-07-15 02:39:06.559 +08:00 [Web] INFO dashboard connected | {"user":"global"}
2026-07-15 02:39:06.793 +08:00 [Media] INFO wvp lab login ok | {"user":"admin","base":"http://127.0.0.1:18080","jwt":true}
```

No matching SIP XML lines after that.

---

## WVP / ZLM Side Evidence

Because the current test likely used **Track B / WVP** path, I also checked `me8-wvp`.

Only related lines found:

```text
2026-07-15 02:39:45.739 [http-nio-18080-exec-4] INFO ... [ZLM HOOK] 录像完成：时长: 31.200000762939453, me8-zlm-modern->.../rtp/34020000001329000009_34020000001329000009/...
2026-07-15 02:39:45.742 [async-18] INFO ... [添加录像记录] rtp/34020000001329000009_34020000001329000009, callId: 21d6cff0e9f53b7a7d22ee71127749dd@0.0.0.0, ...
```

This is **ZLM/WVP cloud-record segment completion**, not a raw BWC physical-button `Alarm` / `DevStatus` XML payload.

---

## Interpretation

Google’s two hypotheses were:

| Hypothesis | Evidence in this test |
|------------|----------------------|
| Instant `Alarm` MESSAGE | **Not seen** |
| Delayed `DevStatus` / `DeviceStatus` with `VideoRecord` change | **Not seen** |

Most likely explanations:

1. The button press happened while the BWC was registered to **WVP SIP 5061**, not Fleet SIP 5060, so Fleet could not see the raw `MESSAGE`.
2. The physical video-record button may be **local-only** and not reported over GB SIP.
3. WVP may receive it but not log raw XML at INFO level.
4. Fleet raw XML logging is not currently verbose enough to capture every keepalive payload; it logs parsed telemetry and alarms.

---

## Clean Next Test

To answer Google properly, run one clean capture:

1. Put one BWC on **Fleet SIP 5060** (not WVP 5061) for this test, or explicitly capture WVP SIP packets.
2. Note exact timestamp before pressing.
3. Press **Video Record** once.
4. Agent scans `fleet.log` for parsed messages.
5. If still no raw XML, use Wireshark filter:

```text
sip && ip.addr == 192.168.1.38
```

or add a tiny **paper/probe MOB** later:

`mob-bwc-button-sip-raw-log`

That MOB would log raw `MESSAGE` XML previews for `DevStatus` / `DeviceStatus` / `Alarm` during a short test window only.

---

## Dashboard Architecture Decision For Now

Do **not** build dashboard listener based on guessed tags yet.

Current evidence says:

- no confirmed `Alarm`;
- no confirmed `VideoRecord` state change;
- no raw payload captured.

For button intelligence, the companion APK `F1/F2/F3/F7` passive telemetry may be more reliable than GB SIP if vendor does not report local record state.

---

## One Line

**This button test did not produce a Fleet SIP XML report; WVP only showed record segment completion. We need a Fleet-5060 raw SIP capture or a short raw-MESSAGE probe before designing the dashboard listener.**
