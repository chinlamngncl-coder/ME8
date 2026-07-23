# MOB DISC — Master task: BWC companion APK + telemetry override

**Date:** 2026-07-15 ~02:50  
**Status:** MASTER PLAN — no code until named `MOB-APPLY`  
**Context:** MTK Android BWCs. Vendor GB28181 app is inadequate for instant SOS / recording / battery. We build a headless companion APK as a sidecar.  
**Critical boundary:** This does **not** replace GB28181 video, WVP/Fleet live, wall, Open All, PTT, or vendor media recording. It only adds faster SOS/button/telemetry signals.

---

## Decision

We will plan this as a real product lane, not a random hack, but in strict stages:

1. Prove Accessibility receives the mapped keys during a live video call.
2. Add backend endpoints only after local key proof.
3. Use companion telemetry as a **fresh override layer** over slow SIP heartbeat fields.
4. Keep vendor app responsible for actual video/audio/photo capture.

---

## Hardware Mapping

ADB-verified keys:

| Physical class | Android key | Companion behavior |
|----------------|-------------|--------------------|
| SOS | `KEYCODE_F4` | **Active intercept**, send SOS trigger, return `true` |
| Media buttons | `KEYCODE_F1`, `KEYCODE_F2`, `KEYCODE_F3`, `KEYCODE_F7` | **Passive sniff**, send button event, return `false` |

`true` only for SOS. `false` for media so vendor app still starts lens / recording / SD-card behavior.

---

## Important Corrections To Google Text

### Do not use `/api/sos-acknowledge`

That endpoint means operator acknowledgement / clearing ownership. Device-side SOS must **create** an incident.

Use future endpoint:

```text
POST /api/bwc-companion/sos-trigger
```

### “Mathematically guarantees” is too strong

Returning `true` consumes the key **if Android delivers it to the AccessibilityService first**. Firmware/native daemons can still intercept before Android. That is why the first MOB is proof-only.

### 15–30 second battery is good, but not magic

BatteryManager is more direct than GB heartbeat, but the app must survive Doze/OEM background policy. Need boot/survival proof.

---

## Android APK Architecture

### Module 1 — Accessibility Button Service

Core behavior:

| Key | ACTION_DOWN behavior | Return |
|-----|----------------------|--------|
| `F4` | Debounced `sendSosToBackend()` | `true` |
| `F1/F2/F3/F7` | `sendButtonEventToBackend(buttonName)` | `false` |
| Others | pass through | `super.onKeyEvent(event)` |

Implementation requirements:

- `res/xml/accessibility_config.xml`
  - `flagRequestFilterKeyEvents`
  - `canRequestFilterKeyEvents="true"`
- Manifest service with `BIND_ACCESSIBILITY_SERVICE`
- Internet permission
- Debounce F4 repeated DOWN / long press
- Offline queue for failed POST
- Include device identity, monotonic time, APK version, battery snapshot

### Module 2 — Native Telemetry Poller

Every 15–30 seconds:

- `BatteryManager` level / charging state
- voltage and temperature if available
- `StatFs` internal storage free/total
- optional network type / RSSI later

Future endpoint:

```text
POST /api/bwc-companion/telemetry
```

### Module 3 — Passive Button Event

Future endpoint:

```text
POST /api/bwc-companion/button-event
```

Payload example:

```json
{
  "deviceId": "34020000001329000009",
  "button": "KEYCODE_F1",
  "event": "BUTTON_F1_PRESSED",
  "action": "ACTION_DOWN",
  "sentAt": "device timestamp",
  "apkVersion": "..."
}
```

Server interprets F1/F2/F3/F7 according to the final physical mapping after field labels are confirmed.

---

## Backend Integration Plan

### Existing ME8 hooks we can reuse

`server.js` already has:

- `mergeBatteryTelemetry(camId, batteryRaw, source)`
- `emitToDashboardSockets('device-status', payload, camId)`
- telemetry fields `battery`, `recording`, `audio`, `callstate`
- `fleetRegistry.updateTelemetry(...)`

So the companion should **not** create a new UI state universe. It should feed the existing device status lane.

### New routes

Future routes:

| Route | Job |
|-------|-----|
| `POST /api/bwc-companion/sos-trigger` | Create/raise SOS incident from device button |
| `POST /api/bwc-companion/telemetry` | Battery/storage override |
| `POST /api/bwc-companion/button-event` | Instant media button event |

Auth:

- device token/HMAC, not anonymous LAN POST;
- per-device token or signed nonce later;
- reject unknown `deviceId`;
- rate-limit SOS and button floods.

### Battery path

On telemetry:

```text
mergeBatteryTelemetry(deviceId, battery.level, 'companion')
```

Then extend telemetry payload later to include:

- voltage
- temperature
- charging
- storage free/total
- source freshness

Dashboard should prefer companion battery if it is fresh, e.g. last 60–90 seconds. Slow SIP DevStatus can fill gaps, not overwrite fresh companion values.

### Media button path

On F1/F2/F3/F7:

- update in-memory override record with timestamp and source `companion_button`;
- emit a WebSocket event, likely:

```text
bwc-companion-button
```

and/or update existing `device-status`:

```json
{
  "cameraId": "...",
  "recording": "1",
  "recordingSource": "companion_button",
  "recordingFreshUntil": "..."
}
```

Frontend can show an instant red “Recording” badge on map/wall while slow SIP heartbeat catches up.

Important: button press is not proof of long-term recording success. It is an **instant intent/edge signal**. SIP/GB/FTP evidence later confirms actual media.

---

## Conflict Policy: Companion vs SIP

| Data | Winner |
|------|--------|
| Fresh companion SOS | Always creates SOS immediately |
| Fresh companion battery | Prefer for 60–90s |
| Fresh companion media button | Prefer for short UI badge window |
| Later SIP DevStatus says recording ON | Confirms / extends badge |
| Later SIP DevStatus says OFF but companion event is fresh | Do not instantly clear; wait grace window |
| No companion heartbeat | Fall back to GB DevStatus |

This avoids the slow heartbeat overwriting the faster edge signal too early.

---

## UI Target

Immediate effects:

- Map pin / wall tile: red “Recording” badge from companion button event.
- Device card: battery updates faster than SIP.
- SOS banner: F4 creates normal ME8 SOS incident, not a separate companion-only alarm.

Do not make a raw lab-looking UI. Use existing Axiom alarm/telemetry style.

---

## MOB Order

| Order | MOB | Job |
|-------|-----|-----|
| 1 | `mob-bwc-companion-f4-proof` | APK logs F4/F1/F2/F3/F7 locally during live video |
| 2 | `mob-bwc-companion-backend-routes` | Add authenticated JSON routes, no UI badge yet |
| 3 | `mob-bwc-companion-sos-trigger` | F4 creates ME8 SOS incident |
| 4 | `mob-bwc-companion-telemetry-override` | Battery/storage into existing telemetry lane |
| 5 | `mob-bwc-companion-button-badges` | F1/F2/F3/F7 immediate UI badges |
| 6 | `mob-bwc-companion-boot-survive` | Reboot/Doze/OEM survival |

Do not bundle APK + backend + UI in one APPLY.

---

## Ship / Security Impact

If this becomes product:

- signed APK custody;
- per-device token provisioning;
- customer install guide or MDM/OEM pre-enable;
- Accessibility permission disclosure;
- backend route auth;
- ship smoke includes F4, battery, one media button;
- security four-pack still required separately.

---

## Parked

- Android SIP audio client remains parked.
- Vendor private protocol remains parked.
- AES/I-frame decrypt remains separate.

---

## One Line

**We will build the companion lane in stages: F4 active SOS intercept, F1/F2/F3/F7 passive media wiretap, BatteryManager telemetry override, and Node routes feeding existing ME8 SOS/device-status UI — but only after local Accessibility key proof.**
