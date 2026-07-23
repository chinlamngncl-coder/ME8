# LOG PACK — fail again 2026-07-20 (operator: SOS×N + Call + PTT, nothing works)

Captured: 2026-07-20 01:01:26 +08:00
Cam focus: `34020000001329000008` (Chin)

## A — Agent verdict (1 screen)

- Event bus + lobotomy OK when HTTP smoke / live open.
- **Physical SOS:** proxy has REGISTER only — **zero** `Alarm` / `event-bus alarm` in this window.
- **Call:** Fleet chose `voicePath: broadcast` `noSip: true` (not classic SIP voice).
- **PTT:** search below for `ptt` / `broadcast` / `29201` — if none for operator press, Fleet never saw cold PTT either.

## B — fleet.log filtered (00:48 → tail, cam 08 / SOS / PTT / voice / invite / event-bus)

```
2026-07-20 00:48:03.915 +08:00 [Media] INFO wvp event bus mounted | {"mount":"/api/lab/wvp/events","legacy":["/api/lab/wvp/device-alarm","/api/lab/wvp/device-ptt-rx"],"auth":"ip_whitelist","note":"Master-Gateway: Fleet brain; no JWT; video INVITE still lobotomized"}
2026-07-20 00:48:03.944 +08:00 [Media] INFO wvp lab routes enabled | {"testPage":"/test-wvp-tile.html","base":"http://127.0.0.1:18080"}
2026-07-20 00:48:04.043 +08:00 [Media] INFO wvp fleet presence started | {"pollMs":8000}
2026-07-20 00:48:04.047 +08:00 [Media] INFO bridge listening | {"ws":3989,"audioWs":3990,"udpVideo":40130,"udpAudio":40132,"tcp":40131,"ffmpeg":"C:\\Users\\user\\Desktop\\Enterprise Mobility\\ME8\\vendor\\ffmpeg-lgpl\\ffmpeg.exe","ffmpegSource":"vendor-lgpl","ffmpegVersion":"ffmpeg version N-125478-gc6498178bb-20260706 Copyright (c) 2000-2026 the FFmpeg developers","mediaTransport":"udp","logFile":"C:\\Users\\user\\Desktop\\Enterprise Mobility\\ME8\\storage\\fleet.log"}
2026-07-20 00:48:04.048 +08:00 [PTT] INFO enabled | {"host":"192.168.1.38","port":29201,"gtid":"49"}
2026-07-20 00:48:04.055 +08:00 [Media] INFO tcp listening | {"host":"192.168.1.38","port":40131}
2026-07-20 00:48:04.056 +08:00 [PTT] INFO listening | {"host":"192.168.1.38","port":29201,"gtid":"49"}
2026-07-20 00:48:04.290 +08:00 [Media] INFO wvp lab login ok | {"user":"admin","base":"http://127.0.0.1:18080","jwt":true}
2026-07-20 00:48:04.318 +08:00 [SIP] INFO device online from wvp presence | {"camId":"34020000001329000009"}
2026-07-20 00:48:04.324 +08:00 [SIP] INFO device online from wvp presence | {"camId":"34020000001329000008"}
2026-07-20 00:48:04.326 +08:00 [Media] INFO wvp fleet presence | {"online":2,"ids":["34020000001329000008","34020000001329000009"]}
2026-07-20 00:48:04.714 +08:00 [SIP] INFO wvp event-bus presence â†’ touch online | {"camId":"34020000001329000008","type":"register","bus":"wvpEventBus"}
2026-07-20 00:48:05.322 +08:00 [Media] INFO pool ws client queued | {"camId":"34020000001329000008"}
2026-07-20 00:48:05.338 +08:00 [Media] INFO pool ws client queued | {"camId":"34020000001329000008"}
2026-07-20 00:48:12.824 +08:00 [SIP] INFO device alarm raised | {"camId":"34020000001329000008","lat":1.316711,"lon":103.759466,"alarmKind":"sos","source":"arch_smoke","alarmMethod":"gb28181","alarmType":"Alarm","liveOnDashboard":false,"streaming":false,"postLiveBye":false,"skipFleetVideoPull":true}
2026-07-20 00:48:12.833 +08:00 [Web] INFO sos-alarm pushed | {"camId":"34020000001329000008","clients":0,"startVideo":false,"refresh":false,"replay":false,"alarmSource":"arch_smoke","independentOfFleetVideo":true}
2026-07-20 00:48:12.834 +08:00 [SIP] INFO mobile position query sending | {"camId":"34020000001329000008","interval":15}
2026-07-20 00:48:12.835 +08:00 [SIP] INFO smart gps tracking start | {"camId":"34020000001329000008","reason":"sos-alarm","intervalSec":15,"reasons":["sos-alarm"]}
2026-07-20 00:48:12.837 +08:00 [SIP] INFO wvp event-bus alarm â†’ fleet handlers | {"camId":"34020000001329000008","result":{"incidentId":"alarm-1784479692826","alarmKind":"sos"},"invite":false,"socketEvent":"sos-alarm","bus":"wvpEventBus"}
2026-07-20 00:48:34.045 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:48:34.551 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:48:44.853 +08:00 [SIP] INFO mobile position query sent | {"camId":"34020000001329000008","interval":15}
2026-07-20 00:49:04.056 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:49:04.569 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:49:05.075 +08:00 [SIP] INFO wvp event-bus presence â†’ touch online | {"camId":"34020000001329000008","type":"register","bus":"wvpEventBus"}
2026-07-20 00:49:06.054 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:49:06.566 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:49:34.070 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:49:34.579 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:49:36.072 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:49:36.584 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:50:04.080 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:50:04.594 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:50:05.297 +08:00 [SIP] INFO wvp event-bus presence â†’ touch online | {"camId":"34020000001329000008","type":"register","bus":"wvpEventBus"}
2026-07-20 00:50:06.084 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:50:06.598 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:50:34.092 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:50:34.604 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:50:36.085 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:50:36.601 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:51:04.106 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:51:04.618 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:51:05.397 +08:00 [SIP] INFO wvp event-bus presence â†’ touch online | {"camId":"34020000001329000008","type":"register","bus":"wvpEventBus"}
2026-07-20 00:51:06.100 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:51:06.609 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:51:11.977 +08:00 [SIP] INFO alarm merged with open incident | {"camId":"34020000001329000008","lat":1.316711,"lon":103.759466,"alarmKind":"sos","source":"native_webhook_confirm","alarmMethod":"gb28181","alarmType":"Alarm"}
2026-07-20 00:51:11.979 +08:00 [Web] INFO sos-alarm pushed | {"camId":"34020000001329000008","clients":0,"startVideo":false,"refresh":true,"replay":false,"alarmSource":"native_webhook_confirm","independentOfFleetVideo":true}
2026-07-20 00:51:11.980 +08:00 [SIP] INFO wvp event-bus alarm â†’ fleet handlers | {"camId":"34020000001329000008","result":{"merged":true,"alarmKind":"sos"},"invite":false,"socketEvent":"sos-alarm","bus":"wvpEventBus"}
2026-07-20 00:51:34.111 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:51:34.621 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:51:36.121 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:51:36.621 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:52:04.113 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:52:04.626 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:52:05.344 +08:00 [SIP] INFO wvp event-bus presence â†’ touch online | {"camId":"34020000001329000008","type":"register","bus":"wvpEventBus"}
2026-07-20 00:52:06.124 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:52:06.626 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:52:34.122 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:52:34.634 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:52:36.127 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:52:36.642 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:53:04.126 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:53:04.638 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:53:05.340 +08:00 [SIP] INFO wvp event-bus presence â†’ touch online | {"camId":"34020000001329000008","type":"register","bus":"wvpEventBus"}
2026-07-20 00:53:06.125 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:53:06.637 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:53:12.858 +08:00 [SIP] INFO mobile position query sending | {"camId":"34020000001329000008","interval":15}
2026-07-20 00:53:34.127 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:53:34.641 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:53:36.138 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:53:36.640 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:53:44.861 +08:00 [SIP] INFO mobile position query sent | {"camId":"34020000001329000008","interval":15}
2026-07-20 00:54:04.131 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:54:04.643 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:54:05.257 +08:00 [SIP] INFO wvp event-bus presence â†’ touch online | {"camId":"34020000001329000008","type":"register","bus":"wvpEventBus"}
2026-07-20 00:54:06.138 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:54:06.652 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:54:34.131 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:54:34.643 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:54:36.140 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:54:36.656 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:55:04.146 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:55:04.660 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:55:05.289 +08:00 [SIP] INFO wvp event-bus presence â†’ touch online | {"camId":"34020000001329000008","type":"register","bus":"wvpEventBus"}
2026-07-20 00:55:06.141 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:55:06.655 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:55:34.147 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:55:34.656 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:55:36.152 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:55:36.668 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:56:04.156 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:56:04.666 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:56:05.328 +08:00 [SIP] INFO wvp event-bus presence â†’ touch online | {"camId":"34020000001329000008","type":"register","bus":"wvpEventBus"}
2026-07-20 00:56:06.154 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:56:06.670 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:56:32.218 +08:00 [Media] INFO wvp event bus mounted | {"mount":"/api/lab/wvp/events","legacy":["/api/lab/wvp/device-alarm","/api/lab/wvp/device-ptt-rx"],"auth":"ip_whitelist","note":"Master-Gateway: Fleet brain; no JWT; video INVITE still lobotomized"}
2026-07-20 00:56:32.234 +08:00 [Media] INFO wvp lab routes enabled | {"testPage":"/test-wvp-tile.html","base":"http://127.0.0.1:18080"}
2026-07-20 00:56:32.304 +08:00 [Media] INFO wvp fleet presence started | {"pollMs":8000}
2026-07-20 00:56:32.307 +08:00 [Media] INFO bridge listening | {"ws":3989,"audioWs":3990,"udpVideo":40130,"udpAudio":40132,"tcp":40131,"ffmpeg":"C:\\Users\\user\\Desktop\\Enterprise Mobility\\ME8\\vendor\\ffmpeg-lgpl\\ffmpeg.exe","ffmpegSource":"vendor-lgpl","ffmpegVersion":"ffmpeg version N-125478-gc6498178bb-20260706 Copyright (c) 2000-2026 the FFmpeg developers","mediaTransport":"udp","logFile":"C:\\Users\\user\\Desktop\\Enterprise Mobility\\ME8\\storage\\fleet.log"}
2026-07-20 00:56:32.307 +08:00 [PTT] INFO enabled | {"host":"192.168.1.38","port":29201,"gtid":"49"}
2026-07-20 00:56:32.312 +08:00 [Media] INFO tcp listening | {"host":"192.168.1.38","port":40131}
2026-07-20 00:56:32.312 +08:00 [PTT] INFO listening | {"host":"192.168.1.38","port":29201,"gtid":"49"}
2026-07-20 00:56:32.475 +08:00 [Media] INFO wvp lab login ok | {"user":"admin","base":"http://127.0.0.1:18080","jwt":true}
2026-07-20 00:56:32.485 +08:00 [SIP] INFO device online from wvp presence | {"camId":"34020000001329000009"}
2026-07-20 00:56:32.490 +08:00 [SIP] INFO device online from wvp presence | {"camId":"34020000001329000008"}
2026-07-20 00:56:32.491 +08:00 [Media] INFO wvp fleet presence | {"online":2,"ids":["34020000001329000008","34020000001329000009"]}
2026-07-20 00:56:34.336 +08:00 [Media] INFO pool ws client queued | {"camId":"34020000001329000008"}
2026-07-20 00:56:34.350 +08:00 [Media] INFO pool ws client queued | {"camId":"34020000001329000008"}
2026-07-20 00:56:50.220 +08:00 [SIP] INFO wvp event-bus presence â†’ touch online | {"camId":"34020000001329000008","type":"register","bus":"wvpEventBus"}
2026-07-20 00:56:56.324 +08:00 [Media] INFO wvp fleet presence | {"online":1,"ids":["34020000001329000009"]}
2026-07-20 00:57:02.673 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:03.188 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:26.521 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:26.523 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:26.525 +08:00 [SIP] INFO fast status poll started | {"camId":"34020000001329000008","reason":"pin-open","intervalMs":2000,"windowMs":180000}
2026-07-20 00:57:26.619 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:26.621 +08:00 [SIP] INFO fast status poll started | {"camId":"34020000001329000008","reason":"start-video","intervalMs":2000,"windowMs":180000}
2026-07-20 00:57:26.630 +08:00 [Media] INFO invite skipped | {"reason":"wvp_fleet_invite_lobotomy","camId":"34020000001329000008","surface":"ops","sosServerPull":false,"invite":false,"trust":"zlm-watch-active"}
2026-07-20 00:57:26.753 +08:00 [Media] INFO wvp lab login ok | {"user":"admin","base":"http://127.0.0.1:18080","jwt":true}
2026-07-20 00:57:26.854 +08:00 [Media] INFO wvp lab login ok | {"user":"admin","base":"http://127.0.0.1:18080","jwt":true}
2026-07-20 00:57:26.864 +08:00 [Media] INFO pool ws client queued | {"camId":"34020000001329000008"}
2026-07-20 00:57:26.878 +08:00 [Media] INFO pool ws client queued | {"camId":"34020000001329000008"}
2026-07-20 00:57:26.890 +08:00 [Media] INFO pool ws client queued | {"camId":"34020000001329000008"}
2026-07-20 00:57:26.901 +08:00 [Media] INFO pool ws client queued | {"camId":"34020000001329000008"}
2026-07-20 00:57:26.914 +08:00 [Media] INFO pool ws client queued | {"camId":"34020000001329000008"}
2026-07-20 00:57:26.927 +08:00 [Media] INFO pool ws client queued | {"camId":"34020000001329000008"}
2026-07-20 00:57:26.976 +08:00 [Media] INFO pool ws client queued | {"camId":"34020000001329000008"}
2026-07-20 00:57:27.027 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:27.029 +08:00 [Media] INFO pool ws client queued | {"camId":"34020000001329000008"}
2026-07-20 00:57:27.061 +08:00 [SIP] INFO login replay deferred | {"camId":"34020000001329000008","reason":"sos_incident"}
2026-07-20 00:57:27.064 +08:00 [Media] INFO pool ws client queued | {"camId":"34020000001329000008"}
2026-07-20 00:57:27.122 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:27.124 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:27.401 +08:00 [Media] INFO pool ws client queued | {"camId":"34020000001329000008"}
2026-07-20 00:57:27.478 +08:00 [Media] INFO pool ws client queued | {"camId":"34020000001329000008"}
2026-07-20 00:57:27.724 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:57:28.329 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:57:28.625 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:28.936 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:57:29.139 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:30.636 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:31.151 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:31.952 +08:00 [PTT] INFO sos response ptt team | {"alarmCamId":"34020000001329000008","teamSize":2,"pushed":2}
2026-07-20 00:57:31.953 +08:00 [SIP] INFO sos acknowledged | {"camId":"34020000001329000008","note":"2","hasSnapshot":true,"helperCount":1,"pttTeamSize":2,"serverRecording":null}
2026-07-20 00:57:32.011 +08:00 [PTT] INFO always-on group restored | {"count":2,"camIds":["34020000001329000009","34020000001329000008"]}
2026-07-20 00:57:32.349 +08:00 [Media] INFO pool ws client queued | {"camId":"34020000001329000008"}
2026-07-20 00:57:32.640 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:32.672 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:32.875 +08:00 [Media] INFO pool ws client queued | {"camId":"34020000001329000008"}
2026-07-20 00:57:33.152 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:33.183 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:33.333 +08:00 [Media] INFO stop-video from dashboard | {"camId":"34020000001329000008","surface":"ops","socketId":"h0yxQIUz73qOrmM_AAAB","remainingViewers":0,"remainingOps":0,"remainingCommandWall":0,"remainingAnalyticsFr":0,"remainingConference":0,"countForCam":0,"socketsWithRefs":0}
2026-07-20 00:57:33.334 +08:00 [Media] INFO pool stop â€” no dashboard viewers | {"camId":"34020000001329000008"}
2026-07-20 00:57:33.335 +08:00 [Media] INFO wvp stopPlay on operator stop | {"camId":"34020000001329000008"}
2026-07-20 00:57:33.336 +08:00 [Media] INFO zlm-watch-unregister | {"camId":"34020000001329000008","socketId":"h0yxQIUz73qOrmM_AAAB","surface":"ops","remainingViewers":0,"zlmWatchers":0}
2026-07-20 00:57:33.359 +08:00 [Media] INFO wvp stopPlay done | {"camId":"34020000001329000008","ok":true,"msg":"æˆåŠŸ"}
2026-07-20 00:57:34.643 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:34.691 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:35.156 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:35.203 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:36.650 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:36.789 +08:00 [Media] INFO wvp lab login ok | {"user":"admin","base":"http://127.0.0.1:18080","jwt":true}
2026-07-20 00:57:37.156 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:37.266 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:37.870 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:38.478 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:57:38.665 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:39.069 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:57:39.177 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:39.674 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:57:40.667 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:41.183 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:42.679 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:43.181 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:44.690 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:45.205 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:46.699 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:47.213 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:48.709 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:49.222 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:50.720 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:51.234 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:52.731 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:53.243 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:54.739 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:55.250 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:56.748 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:57.261 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:58.533 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:58.534 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:58.641 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:58.750 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:57:59.046 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:59.162 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:59.164 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:59.270 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:57:59.449 +08:00 [Media] INFO wvp lab login ok | {"user":"admin","base":"http://127.0.0.1:18080","jwt":true}
2026-07-20 00:57:59.727 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:57:59.898 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:00.334 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:58:00.503 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:00.642 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:00.751 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:00.940 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:58:01.111 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:58:01.143 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:01.268 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:01.730 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:58:01.967 +08:00 [Media] INFO wvp lab login ok | {"user":"admin","base":"http://127.0.0.1:18080","jwt":true}
2026-07-20 00:58:02.308 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:58:02.453 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:02.655 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:02.679 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:02.751 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:02.826 +08:00 [Media] INFO wvp lab login ok | {"user":"admin","base":"http://127.0.0.1:18080","jwt":true}
2026-07-20 00:58:03.055 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:03.165 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:03.180 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:03.259 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:03.281 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:03.663 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:58:03.689 +08:00 [Media] INFO wvp lab login ok | {"user":"admin","base":"http://127.0.0.1:18080","jwt":true}
2026-07-20 00:58:03.881 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:03.960 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000008","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:58:03.961 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000009","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:58:04.022 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000009","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:58:04.024 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000008","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:58:04.101 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:04.255 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:58:04.488 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:58:04.643 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:04.676 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:04.708 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:04.755 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:04.863 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:58:05.096 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:58:05.158 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:05.190 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:05.284 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:05.315 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:58:05.688 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:58:05.905 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:58:06.511 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:58:06.651 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:06.760 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:07.163 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:07.274 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:08.653 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:08.762 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:09.168 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:09.276 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:09.278 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:09.884 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:10.489 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:58:10.676 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:10.769 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:11.081 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:58:11.189 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:11.283 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:11.690 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:58:12.682 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:12.776 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:13.196 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:13.288 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:14.686 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:14.778 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:15.197 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:15.290 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:16.695 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:16.788 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:17.222 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:17.299 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:18.705 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:18.799 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:19.220 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:19.313 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:20.234 +08:00 [SIP] INFO device offline | {"camId":"34020000001329000008","reason":"keepalive_timeout"}
2026-07-20 00:58:20.714 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:20.807 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:21.228 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:21.321 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:22.737 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:22.814 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:23.250 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:23.328 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:24.748 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:24.825 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:25.247 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:25.342 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:26.754 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:26.833 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:27.267 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:27.344 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:28.759 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:28.837 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:29.271 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:29.348 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:30.761 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:30.840 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:31.279 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:31.357 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:31.916 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:32.519 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:32.769 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:32.847 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:33.125 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:58:33.280 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:33.359 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:33.747 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:58:34.323 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:58:34.464 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:34.694 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:34.755 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:34.848 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:35.064 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:35.189 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:35.268 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:35.284 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:35.361 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:35.671 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:58:35.889 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:36.106 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:36.261 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:58:36.493 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:58:36.712 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:36.790 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:36.852 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:36.868 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:58:37.101 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:58:37.288 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:37.320 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:58:37.366 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:37.705 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:58:37.923 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:58:38.525 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:58:38.776 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:38.852 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:39.291 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:39.368 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:40.765 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:40.858 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:41.293 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:41.371 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:42.787 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:42.864 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:43.298 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:43.375 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:44.790 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:44.868 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:45.305 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:45.383 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:46.785 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:46.876 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:47.297 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:47.390 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:47.987 +08:00 [SIP] INFO wvp event-bus presence â†’ touch online | {"camId":"34020000001329000008","type":"register","bus":"wvpEventBus"}
2026-07-20 00:58:48.437 +08:00 [Media] INFO wvp fleet presence | {"online":2,"ids":["34020000001329000008","34020000001329000009"]}
2026-07-20 00:58:48.803 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:48.881 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:49.315 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:49.395 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:50.809 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:50.887 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:51.325 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:51.404 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:52.820 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:52.898 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:53.335 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:53.398 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:54.830 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:54.908 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:55.342 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:55.420 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:56.837 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:56.915 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:57.351 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:57.429 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:58.838 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:58.916 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:58:59.349 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:58:59.427 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:00.844 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:00.923 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:01.359 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:01.437 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:02.343 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:02.857 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:02.858 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:02.934 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:03.369 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:03.448 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:04.597 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:04.598 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:04.599 +08:00 [SIP] INFO fast status poll started | {"camId":"34020000001329000008","reason":"pin-open","intervalMs":2000,"windowMs":180000}
2026-07-20 00:59:04.652 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:04.653 +08:00 [SIP] INFO fast status poll started | {"camId":"34020000001329000008","reason":"start-video","intervalMs":2000,"windowMs":180000}
2026-07-20 00:59:04.656 +08:00 [Media] INFO invite skipped | {"reason":"wvp_fleet_invite_lobotomy","camId":"34020000001329000008","surface":"ops","sosServerPull":false,"invite":false,"trust":"zlm-watch-active"}
2026-07-20 00:59:04.728 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:04.731 +08:00 [SIP] INFO fast status poll started | {"camId":"34020000001329000008","reason":"start-video","intervalMs":2000,"windowMs":180000}
2026-07-20 00:59:04.735 +08:00 [Media] INFO invite skipped | {"reason":"wvp_fleet_invite_lobotomy","camId":"34020000001329000008","surface":"ops","sosServerPull":false,"invite":false,"trust":"zlm-watch-active"}
2026-07-20 00:59:04.755 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:04.756 +08:00 [SIP] INFO fast status poll started | {"camId":"34020000001329000008","reason":"start-video","intervalMs":2000,"windowMs":180000}
2026-07-20 00:59:04.760 +08:00 [Media] INFO invite skipped | {"reason":"wvp_fleet_invite_lobotomy","camId":"34020000001329000008","surface":"ops","sosServerPull":false,"invite":false,"trust":"zlm-watch-active"}
2026-07-20 00:59:04.852 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:05.099 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:05.123 +08:00 [Media] INFO pool ws client queued | {"camId":"34020000001329000008"}
2026-07-20 00:59:05.161 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:05.209 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:05.240 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:05.256 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:05.345 +08:00 [Media] INFO pool ws client queued | {"camId":"34020000001329000008"}
2026-07-20 00:59:05.365 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:05.798 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:59:06.409 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:59:06.766 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:06.859 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:07.000 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:59:07.116 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:07.117 +08:00 [SIP] INFO fast status poll started | {"camId":"34020000001329000008","reason":"zlm-watch-active","intervalMs":2000,"windowMs":180000}
2026-07-20 00:59:07.118 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:07.118 +08:00 [Media] INFO zlm-watch-active | {"camId":"34020000001329000008","socketId":"yIWBSUQGhWjXFcfkAAAL","surface":"ops","viewers":1,"zlmWatchers":1,"opsLive":true,"invite":false,"source":"zlm-wvp"}
2026-07-20 00:59:07.121 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:07.122 +08:00 [SIP] INFO fast status poll started | {"camId":"34020000001329000008","reason":"zlm-watch-active","intervalMs":2000,"windowMs":180000}
2026-07-20 00:59:07.122 +08:00 [SIP] INFO device status query throttled | {"camId":"34020000001329000008","cooldownSec":90}
2026-07-20 00:59:07.123 +08:00 [Media] INFO zlm-watch-active | {"camId":"34020000001329000008","socketId":"yIWBSUQGhWjXFcfkAAAL","surface":"ops","viewers":1,"zlmWatchers":1,"opsLive":true,"invite":false,"source":"zlm-wvp"}
2026-07-20 00:59:07.125 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:07.125 +08:00 [SIP] INFO fast status poll started | {"camId":"34020000001329000008","reason":"zlm-watch-active","intervalMs":2000,"windowMs":180000}
2026-07-20 00:59:07.126 +08:00 [SIP] INFO device status query throttled | {"camId":"34020000001329000008","cooldownSec":90}
2026-07-20 00:59:07.127 +08:00 [Media] INFO zlm-watch-active | {"camId":"34020000001329000008","socketId":"yIWBSUQGhWjXFcfkAAAL","surface":"ops","viewers":1,"zlmWatchers":1,"opsLive":true,"invite":false,"source":"zlm-wvp"}
2026-07-20 00:59:07.128 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:07.128 +08:00 [SIP] INFO fast status poll started | {"camId":"34020000001329000008","reason":"zlm-watch-active","intervalMs":2000,"windowMs":180000}
2026-07-20 00:59:07.129 +08:00 [SIP] INFO device status query throttled | {"camId":"34020000001329000008","cooldownSec":90}
2026-07-20 00:59:07.130 +08:00 [Media] INFO zlm-watch-active | {"camId":"34020000001329000008","socketId":"yIWBSUQGhWjXFcfkAAAL","surface":"ops","viewers":1,"zlmWatchers":1,"opsLive":true,"invite":false,"source":"zlm-wvp"}
2026-07-20 00:59:07.277 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:07.301 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:07.302 +08:00 [SIP] INFO fast status poll started | {"camId":"34020000001329000008","reason":"zlm-watch-active","intervalMs":2000,"windowMs":180000}
2026-07-20 00:59:07.302 +08:00 [SIP] INFO device status query throttled | {"camId":"34020000001329000008","cooldownSec":90}
2026-07-20 00:59:07.303 +08:00 [Media] INFO zlm-watch-active | {"camId":"34020000001329000008","socketId":"yIWBSUQGhWjXFcfkAAAL","surface":"ops","viewers":1,"zlmWatchers":1,"opsLive":true,"invite":false,"source":"zlm-wvp"}
2026-07-20 00:59:07.305 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:07.305 +08:00 [SIP] INFO fast status poll started | {"camId":"34020000001329000008","reason":"zlm-watch-active","intervalMs":2000,"windowMs":180000}
2026-07-20 00:59:07.306 +08:00 [SIP] INFO device status query throttled | {"camId":"34020000001329000008","cooldownSec":90}
2026-07-20 00:59:07.307 +08:00 [Media] INFO zlm-watch-active | {"camId":"34020000001329000008","socketId":"yIWBSUQGhWjXFcfkAAAL","surface":"ops","viewers":1,"zlmWatchers":1,"opsLive":true,"invite":false,"source":"zlm-wvp"}
2026-07-20 00:59:07.373 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:07.623 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:07.624 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:07.637 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:07.639 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:07.730 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:07.807 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:07.808 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:08.332 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:59:08.857 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:08.920 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:59:09.120 +08:00 [PTT] INFO group refresh scheduled | {"camId":"34020000001329000008","delayMs":2000,"reason":"zlm-watch"}
2026-07-20 00:59:09.123 +08:00 [PTT] INFO group refresh scheduled | {"camId":"34020000001329000008","delayMs":2000,"reason":"zlm-watch"}
2026-07-20 00:59:09.135 +08:00 [PTT] INFO group refresh scheduled | {"camId":"34020000001329000008","delayMs":2000,"reason":"zlm-watch"}
2026-07-20 00:59:09.139 +08:00 [PTT] INFO group refresh scheduled | {"camId":"34020000001329000008","delayMs":2000,"reason":"zlm-watch"}
2026-07-20 00:59:09.306 +08:00 [PTT] INFO group refresh scheduled | {"camId":"34020000001329000008","delayMs":2000,"reason":"zlm-watch"}
2026-07-20 00:59:09.308 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:09.311 +08:00 [PTT] INFO group refresh scheduled | {"camId":"34020000001329000008","delayMs":2000,"reason":"zlm-watch"}
2026-07-20 00:59:09.382 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:09.523 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:59:09.818 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:09.885 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:09.886 +08:00 [PTT] INFO operator fleet ptt wake | {"camId":"34020000001329000008","user":"global"}
2026-07-20 00:59:10.499 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:10.857 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:10.882 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:10.884 +08:00 [PTT] INFO operator fleet ptt wake | {"camId":"34020000001329000008","user":"global"}
2026-07-20 00:59:11.089 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:59:11.319 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:11.381 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:11.490 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:11.690 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:59:11.828 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:12.091 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:59:12.293 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:59:12.695 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:59:12.867 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:13.298 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:59:13.328 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:13.374 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:13.839 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:14.879 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:15.130 +08:00 [PTT] INFO group refresh scheduled | {"camId":"34020000001329000008","delayMs":8000,"reason":"zlm-watch"}
2026-07-20 00:59:15.132 +08:00 [PTT] INFO group refresh scheduled | {"camId":"34020000001329000008","delayMs":8000,"reason":"zlm-watch"}
2026-07-20 00:59:15.134 +08:00 [PTT] INFO group refresh scheduled | {"camId":"34020000001329000008","delayMs":8000,"reason":"zlm-watch"}
2026-07-20 00:59:15.136 +08:00 [PTT] INFO group refresh scheduled | {"camId":"34020000001329000008","delayMs":8000,"reason":"zlm-watch"}
2026-07-20 00:59:15.314 +08:00 [PTT] INFO group refresh scheduled | {"camId":"34020000001329000008","delayMs":8000,"reason":"zlm-watch"}
2026-07-20 00:59:15.317 +08:00 [PTT] INFO group refresh scheduled | {"camId":"34020000001329000008","delayMs":8000,"reason":"zlm-watch"}
2026-07-20 00:59:15.329 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:15.391 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:15.392 +08:00 [PTT] INFO operator fleet ptt wake | {"camId":"34020000001329000008","user":"global"}
2026-07-20 00:59:15.392 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:15.838 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:15.994 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:16.598 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:59:16.875 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:17.200 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:59:17.213 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:17.215 +08:00 [SIP] INFO fast status poll started | {"camId":"34020000001329000008","reason":"zlm-watch-active","intervalMs":2000,"windowMs":180000}
2026-07-20 00:59:17.217 +08:00 [SIP] INFO device status query throttled | {"camId":"34020000001329000008","cooldownSec":90}
2026-07-20 00:59:17.218 +08:00 [Media] INFO zlm-watch-active | {"camId":"34020000001329000008","socketId":"yIWBSUQGhWjXFcfkAAAL","surface":"ops","viewers":1,"zlmWatchers":1,"opsLive":true,"invite":false,"source":"zlm-wvp"}
2026-07-20 00:59:17.220 +08:00 [Media] INFO start-bwc-call | {"camId":"34020000001329000008","audioOnly":false}
2026-07-20 00:59:17.222 +08:00 [Media] INFO voice call path | {"camId":"34020000001329000008","voicePath":"broadcast","reason":"zlm_live_sip_fallback"}
2026-07-20 00:59:17.224 +08:00 [Media] INFO voice call broadcast-notify | {"camId":"34020000001329000008","noSip":true}
2026-07-20 00:59:17.226 +08:00 [SIP] INFO voice broadcast sent | {"device":"34020000001329000008"}
2026-07-20 00:59:17.386 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:17.724 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:17.801 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:59:18.881 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:19.225 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:19.227 +08:00 [PTT] INFO group refresh scheduled | {"camId":"34020000001329000008","delayMs":2000,"reason":"zlm-watch"}
2026-07-20 00:59:19.396 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:19.735 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:20.896 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:21.236 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:21.405 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:21.743 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:22.356 +08:00 [Media] INFO stop-video from dashboard | {"camId":"34020000001329000008","surface":"ops","socketId":"yIWBSUQGhWjXFcfkAAAL","remainingViewers":0,"remainingOps":0,"remainingCommandWall":0,"remainingAnalyticsFr":0,"remainingConference":0,"countForCam":0,"socketsWithRefs":0}
2026-07-20 00:59:22.357 +08:00 [Media] INFO pool stop â€” no dashboard viewers | {"camId":"34020000001329000008"}
2026-07-20 00:59:22.358 +08:00 [Media] INFO wvp stopPlay on operator stop | {"camId":"34020000001329000008"}
2026-07-20 00:59:22.359 +08:00 [Media] INFO zlm-watch-unregister | {"camId":"34020000001329000008","socketId":"yIWBSUQGhWjXFcfkAAAL","surface":"ops","remainingViewers":0,"zlmWatchers":0}
2026-07-20 00:59:22.380 +08:00 [Media] INFO wvp stopPlay done | {"camId":"34020000001329000008","ok":true,"msg":"æˆåŠŸ"}
2026-07-20 00:59:22.411 +08:00 [SIP] INFO wvp event-bus presence â†’ touch online | {"camId":"34020000001329000008","type":"register","bus":"wvpEventBus"}
2026-07-20 00:59:22.892 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:23.250 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:23.421 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:23.764 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:24.900 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:25.228 +08:00 [PTT] INFO group refresh scheduled | {"camId":"34020000001329000008","delayMs":8000,"reason":"zlm-watch"}
2026-07-20 00:59:25.259 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:25.415 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:25.773 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:26.909 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:27.268 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:27.423 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:27.780 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:28.931 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:29.271 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:29.443 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:29.780 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:30.919 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:31.279 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:31.435 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:31.794 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:32.358 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:32.859 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:32.938 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:33.280 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:33.451 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:33.795 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:34.354 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:34.866 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:34.944 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:35.287 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:35.459 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:35.804 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:36.601 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:36.602 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:36.662 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:36.740 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:36.772 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:37.111 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:37.173 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:37.220 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:37.252 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:37.267 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:37.298 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:37.811 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:59:37.814 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:38.414 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:59:38.770 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:39.003 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:59:39.127 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:39.129 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:39.142 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:39.145 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:39.147 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:39.283 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:39.298 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:39.313 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:39.315 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:39.636 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:39.638 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:39.641 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:39.642 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:39.744 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:39.807 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:39.821 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:39.824 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:40.334 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:59:40.925 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:59:41.125 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000008","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:59:41.127 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000008","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:59:41.141 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000008","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:59:41.143 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000008","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:59:41.311 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:41.313 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000008","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:59:41.315 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:41.327 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000008","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:59:41.528 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:59:41.821 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:41.824 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:41.899 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000008","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:59:41.900 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:42.505 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:42.898 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000008","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:59:42.901 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:43.101 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:59:43.318 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:43.335 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:43.507 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:43.694 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:59:43.834 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:43.836 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:44.098 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:59:44.301 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:59:44.705 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:59:45.313 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:59:45.328 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:45.330 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:45.842 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:45.844 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:47.136 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000008","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:59:47.137 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000008","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:59:47.139 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000008","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:59:47.140 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000008","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:59:47.322 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000008","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:59:47.324 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000008","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:59:47.337 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:47.339 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:47.400 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000008","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:59:47.402 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:47.847 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:47.849 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:48.002 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:48.119 +08:00 [SIP] INFO wvp event-bus presence â†’ touch online | {"camId":"34020000001329000008","type":"register","bus":"wvpEventBus"}
2026-07-20 00:59:48.609 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"direct"}
2026-07-20 00:59:49.203 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DevStatus","style":"target"}
2026-07-20 00:59:49.234 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:49.341 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:49.729 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:49.808 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceInfo","style":"direct"}
2026-07-20 00:59:49.854 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:51.239 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:51.240 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000008","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:59:51.348 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:51.740 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:51.864 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:53.252 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:53.361 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:53.751 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:53.877 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:55.265 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:55.373 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:55.776 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:55.885 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:57.243 +08:00 [PTT] INFO group config sent | {"camId":"34020000001329000008","gtid":"49","host":"192.168.1.38","port":29201,"status":"1"}
2026-07-20 00:59:57.274 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:57.383 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:57.787 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:57.896 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:59.281 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:59.391 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 00:59:59.795 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 00:59:59.904 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:01.274 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:01.400 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:01.790 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:01.914 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:02.370 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:02.881 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:03.288 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:03.414 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:03.808 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:03.918 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:04.373 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:04.873 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:05.295 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:05.421 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:05.807 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:05.936 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:07.294 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:07.435 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:07.805 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:07.946 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:09.313 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:09.437 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:09.826 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:09.950 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:11.302 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:11.443 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:11.817 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:11.957 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:13.314 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:13.455 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:13.828 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:13.966 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:15.321 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:15.461 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:15.836 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:15.978 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:17.345 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:17.468 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:17.857 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:17.983 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:19.345 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:19.470 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:19.858 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:19.983 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:21.356 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:21.482 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:21.867 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:21.992 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:23.356 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:23.495 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:23.870 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:24.011 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:25.366 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:25.505 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:25.894 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:26.018 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:27.380 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:27.519 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:27.892 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:28.033 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:29.398 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:29.525 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:29.900 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:30.039 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:31.399 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:31.540 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:31.914 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:32.054 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:32.381 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:32.892 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:33.408 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:33.548 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:33.922 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:34.063 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:34.373 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:34.889 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:35.432 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:35.557 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:35.931 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:36.070 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:37.438 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:37.563 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:37.952 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:38.074 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:39.443 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:39.565 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:39.953 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:40.078 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:41.445 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:41.568 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:41.959 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:42.081 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:43.450 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:43.574 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:43.965 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:44.088 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:45.471 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:45.580 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:45.983 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:46.091 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:47.474 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:47.583 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:47.990 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:48.097 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:48.187 +08:00 [SIP] INFO wvp event-bus presence â†’ touch online | {"camId":"34020000001329000008","type":"register","bus":"wvpEventBus"}
2026-07-20 01:00:49.487 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:49.593 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:50.000 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:50.109 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:51.480 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:51.606 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:51.997 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:52.107 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:53.493 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:53.618 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:54.007 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:54.130 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:55.514 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:55.623 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:56.027 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:56.137 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:57.523 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:57.631 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:58.022 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:58.146 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:00:59.534 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:00:59.642 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:00.044 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:00.154 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:01.540 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:01.649 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:02.053 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:02.163 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:02.383 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:02.893 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:03.548 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:03.658 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:04.059 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:04.167 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:04.385 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:04.898 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:05.551 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:05.662 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:06.067 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:06.175 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:07.565 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:07.673 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:08.073 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:08.179 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:09.565 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:09.673 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:10.078 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:10.187 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:11.582 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:11.676 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:12.096 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:12.189 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:13.570 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:13.680 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:14.085 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:14.193 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:15.584 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:15.693 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:16.099 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:16.208 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:17.592 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:17.700 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:18.103 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:18.209 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:19.592 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:19.714 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:20.104 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:20.229 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:21.603 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:21.728 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:22.116 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:22.241 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:23.611 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:23.736 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:24.111 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:24.252 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:25.627 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:25.738 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"direct"}
2026-07-20 01:01:26.144 +08:00 [SIP] INFO device status query sent | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
2026-07-20 01:01:26.253 +08:00 [SIP] INFO device status query sending | {"camId":"34020000001329000008","cmdType":"DeviceStatus","style":"target"}
```

## C — proxy.out.log (same window, all lines mentioning cam / Alarm / MESSAGE / event-bus / REGISTER)

```
2026-07-19T16:47:55.378Z [wvp-sip-lan-proxy] start {"listen":5060,"target":"127.0.0.1:15061","syncMs":10000,"inviteRelay":true,"inviteTarget":"register_peer_nat_pinhole","eventBus":"127.0.0.1:3988/api/lab/wvp/events","mode":"dumb-passthrough+event-bus"}
2026-07-19T16:48:04.682Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.119:40570"}
2026-07-19T16:48:04.717Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:48:04.934Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.119:40570"}
2026-07-19T16:48:04.944Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:48:05.047Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.119:40570"}
2026-07-19T16:48:05.051Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:49:05.065Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.119:40570"}
2026-07-19T16:49:05.078Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:50:05.289Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.119:40570"}
2026-07-19T16:50:05.298Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:51:05.389Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.119:40570"}
2026-07-19T16:51:05.399Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:52:05.336Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.119:40570"}
2026-07-19T16:52:05.345Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:53:05.336Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.119:40570"}
2026-07-19T16:53:05.341Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:54:05.250Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.119:40570"}
2026-07-19T16:54:05.258Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:55:05.282Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.119:40570"}
2026-07-19T16:55:05.289Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:56:05.321Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.119:40570"}
2026-07-19T16:56:05.329Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:56:50.203Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.119:40570"}
2026-07-19T16:56:50.222Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:56:50.239Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.119:40570"}
2026-07-19T16:56:50.241Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:58:47.980Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.126:58454"}
2026-07-19T16:58:47.989Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:58:48.006Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.126:58454"}
2026-07-19T16:58:48.008Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:58:48.139Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.126:58454"}
2026-07-19T16:58:48.144Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:58:53.975Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.126:58454"}
2026-07-19T16:58:53.981Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:58:58.911Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.126:58454"}
2026-07-19T16:58:58.919Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:59:05.407Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.126:58454"}
2026-07-19T16:59:05.415Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:59:05.750Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.126:58454"}
2026-07-19T16:59:05.756Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:59:22.409Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.126:58454"}
2026-07-19T16:59:22.413Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T16:59:48.110Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.126:58454"}
2026-07-19T16:59:48.120Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T17:00:48.180Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.126:58454"}
2026-07-19T17:00:48.188Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T17:01:13.046Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.126:58472"}
2026-07-19T17:01:13.052Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T17:01:13.077Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.126:58472"}
2026-07-19T17:01:13.079Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
2026-07-19T17:01:13.144Z [wvp-sip-lan-proxy] REGISTER/tcp {"deviceId":"34020000001329000008","peer":"192.168.1.126:58472"}
2026-07-19T17:01:13.146Z [wvp-sip-lan-proxy] event-bus register â†’ ME8 {"path":"/api/lab/wvp/events","status":200,"host":"127.0.0.1:3988","cameraId":"34020000001329000008"}
```

## D — Count checks (proof of silence)

- Proxy lines matching Alarm|event-bus alarm (all file history scan of match pattern): see filtered C
- Fleet `event-bus alarm` hits (whole file count): 2 (includes smoke)
- Fleet smoke sources arch_smoke|native_webhook_confirm: 4

## E — What Google should answer

1. On WVP-platform home, does Chin SOS emit GB28181 `CmdType=Alarm` MESSAGE on SIP, or only proprietary?
2. Best next wire without SIP split to Fleet :5062: WVP REST alarm poll / hook / companion?
3. Cold PTT + Call when video is WVP/ZLM and Fleet SIP lobotomized — expected path?


---

## UPDATE after re-read (+01:01) — give Google this too

### Physical Alarm PROVED on cam 009
```
2026-07-20 01:01:44.178 device alarm raised camId=...009 source=wvp_sip_proxy
2026-07-20 01:01:44.188 sos-alarm pushed clients:1
proxy: event-bus alarm → ME8 status=200 cameraId=...009
proxy: INVITE 100/200 from cam 192.168.1.140 (live after SOS)
```

### Chin 008 in fail window
- No `device alarm raised` for 008 after 00:56 (only agent smoke earlier).
- Proxy: REGISTER only for 008 at 192.168.1.126.
- Earlier same night 23:07:20 008 DID raise via wvp_sip_proxy — so 008 can Alarm; tonight's presses did not hit the wire.

### Call / PTT (008 ~00:59)
```
PTT: operator fleet ptt wake ×3 (no WVP broadcast API log line found)
Call: start-bwc-call → voicePath=broadcast reason=zlm_live_sip_fallback noSip=true → voice broadcast sent
```

Full narrative: `docs/MOB-DISC-FAIL-AGAIN-LOG-NO-ALARM-ON-WIRE-20260720.md`

