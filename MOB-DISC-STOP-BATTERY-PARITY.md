# MOB DISC — Stop/signal toast missing · kk vs Chin battery parity

**Date:** 2026-07-23  
**Also known as:** stop/battery disc (was `docs/MOB-DISC-STOP-TOAST-AND-BATTERY-KK-CHIN-LOG-20260723.md` before `git clean -fd`)  
**Restored path:** `MOB-DISC-STOP-BATTERY-PARITY.md` (repo root) — `MOB-EXECUTE-WORKSPACE-RECOVERY-V1`  
**Trigger:** Hybrid SIP V4 abandoned; operator noticed **Stopped by BWC / video signal lost** chrome gone; asked about **kk battery ~1019** and **Chin** empty battery.  
**Log:** `storage/fleet.log`  
**Status:** DISC only — no SOS/PTT experiment code. Hybrid genre **forgotten**.

---

## Plain English (verdict)

1. **Hybrid private SOS/PTT SIP** — park / forget (vendor / WVP-homed signaling).  
2. **Stopped by BWC / Video signal lost** — missing under **WVP video handoff** because stop goes through **WVP soft/hard-stop**, which does **not** emit Fleet `video-stream-stopped` + `device_bye` that paints those overlays. Classic Fleet SIP BYE → pool path used to drive them.  
3. **kk battery** — **yes** tonight via WVP ACL. Last good **22:16:07 = 29%**. Around **22:19** ACL rows mostly `battery:null`.  
4. **Chin battery** — **no fresh battery on 2026-07-23**. Last Chin update **2026-07-22 22:30:43 = 63%**. That is why Chin shows empty / “—” while kk had numbers.

---

## Device map (`storage/bwc-devices.json`)

| CamId | Operator |
|-------|----------|
| `34020000001329000008` | **Chin** |
| `34020000001329000009` | **kk** |

---

## Battery — log facts

### kk (`…00009`)

| Time (+08) | Event |
|------------|--------|
| 22:08 → 22:16 | Repeated `telemetry battery update` · **30% → 29%** · `source":"wvp-acl"` |
| **22:16:07** | **Last good:** `battery":"29%"` |
| 22:16+ | Many `wvp acl device-status → fleet` with **`battery":null`** (one good interleaved line at 22:16:07 still had 29% + signal `0/-56`) |
| **~22:19** | ACL still **null** battery |

At **1019 / 22:19**: Fleet was querying / receiving ACL status, but **not** a fresh battery % — last real value was ~3 minutes earlier (**29%**).

### Chin (`…00008`) — why no battery

| Time (+08) | Event |
|------------|--------|
| **2026-07-22 22:30:43** | **Last** `telemetry battery update` · **63%** · `wvp-acl` |
| **2026-07-23** | **No** Chin `telemetry battery update` in reviewed log window |
| 22:16 / 22:19 | `wvp acl device-status` for Chin with **`battery":null` only** |

**Why:** On this edition battery arrives via **WVP ACL → Fleet** (`wvp-acl`), not a reliable Fleet SIP `DeviceStatus` `<Battery>` reply. WVP fed **kk**; **Chin got no non-null battery field** the same night. Consistent with **vendor / WVP telemetry unevenness**, not “Chin UI only broken.”

---

## Stopped by BWC / Video signal lost — why gone this edition

### Classic driver

- Fleet SIP **BYE** → `liveStreamPool.onRemoteBye` → `io.emit('video-stream-stopped', { reason: 'device_bye' })`  
- Wall (`video-wall.js`) → `markBwcStoppedOverlay` / `markVideoSignalLost`

### Log at ~22:19 instead

```text
22:19:16  wvp video handoff soft-stop scheduled  …00009 (kk)
22:19:20  wvp video handoff hard-stop            …00009
22:19:47  soft-stop …00009
22:19:48  soft-stop …00008 (Chin)
22:19:51  hard-stop …00009
22:19:52  hard-stop …00008
```

**Not found:** `bye from device` / `device_bye` / `video-stream-stopped` for those stops.

### Code gap

`lib/wvpVideoHandoff.js` `hardStopOne` calls WVP `stopPlay` and logs hard-stop — **does not** emit `video-stream-stopped` with `device_bye`.  
`server.js` only emits `device_bye` from the **Fleet pool BYE** path.

With **`FM_WVP_VIDEO_HANDOFF=1`**, stop is **WVP-owned**; Fleet overlay path never gets the event → no Stopped by BWC / signal-lost chrome.

---

## Recommendation (one next path — when wanted)

**`MOB-APPLY WVP-HANDOFF-STOP-UI-PARITY-V1`**

On WVP handoff soft/hard-stop, emit the same dashboard signal classic used (`video-stream-stopped` + `device_bye` or `wvp_stop`) so wall/pin show **Stopped by BWC** again. Do **not** change INVITE/video start. Do **not** reopen hybrid SIP.

**Battery Chin parity** — separate later item (why WVP ACL sends battery for kk but null for Chin).

---

## One line

**kk had 29% until 22:16 (wvp-acl); at 22:19 ACL was null. Chin has no battery update today (last 63% yesterday). Stop/signal chrome is missing because WVP hard-stop never fires Fleet `device_bye` UI events.**
