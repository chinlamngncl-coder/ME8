# MOB DISC — BWC companion APK button map: F4 active SOS, F1/F2/F3/F7 passive

**Date:** 2026-07-15 ~02:16  
**Status:** DISC ONLY — no Android project / APK compile until named `MOB-APPLY`  
**Builds on:** `MOB-DISC-BWC-COMPANION-SOS-F4-BATTERY-PLAN.md`  
**Hardware lead:** ADB testing maps physical buttons to Android `KEYCODE_F1`, `F2`, `F3`, `F4`, `F7`.

---

## Decision

This is the right split:

| Button class | Keys | Behavior | Return |
|--------------|------|----------|--------|
| **Active SOS override** | `KEYCODE_F4` | Send SOS to ME8, block vendor app | `true` |
| **Passive media sniffer** | `KEYCODE_F1/F2/F3/F7` | Log telemetry, let vendor video/audio/photo continue | `false` |

This protects the critical rule:

> Only SOS is stolen. Media buttons are observed, not hijacked.

---

## Exact future APK logic

For the first lab spike, the service logic should follow the pasted shape:

```java
@Override
protected boolean onKeyEvent(KeyEvent event) {
    int keyCode = event.getKeyCode();
    int action = event.getAction();

    // 1. ACTIVE INTERCEPTION: SOS BUTTON (KEY_F4)
    if (keyCode == KeyEvent.KEYCODE_F4) {
        if (action == KeyEvent.ACTION_DOWN) {
            Log.i("BWC_Service", "SOS Triggered - Sending to Server");
            sendSosToBackend();
        }
        return true;
    }

    // 2. PASSIVE SNIFFING: MEDIA BUTTONS (KEY_F1, F2, F3, F7)
    if (keyCode == KeyEvent.KEYCODE_F1 ||
        keyCode == KeyEvent.KEYCODE_F2 ||
        keyCode == KeyEvent.KEYCODE_F3 ||
        keyCode == KeyEvent.KEYCODE_F7) {

        if (action == KeyEvent.ACTION_DOWN) {
            String buttonName = "UNKNOWN_MEDIA_BTN";
            if (keyCode == KeyEvent.KEYCODE_F1) buttonName = "BUTTON_F1";
            if (keyCode == KeyEvent.KEYCODE_F2) buttonName = "BUTTON_F2";
            if (keyCode == KeyEvent.KEYCODE_F3) buttonName = "BUTTON_F3";
            if (keyCode == KeyEvent.KEYCODE_F7) buttonName = "BUTTON_F7";

            Log.i("BWC_Service", buttonName + " Sniffed - Logging to Server");
            sendTelemetryToBackend(buttonName + "_PRESSED");
        }

        return false;
    }

    return super.onKeyEvent(event);
}
```

---

## Important caveats

### `true` for F4

Returning `true` consumes the Android key event **if** Accessibility receives it first. That is what we want for SOS.

In production we should also guard duplicate long-press repeats:

- `event.getRepeatCount() == 0`, or
- local debounce window, e.g. 2-5 seconds.

The first lab proof can log raw behavior so we see whether the BWC repeats F4.

### `false` for media keys

Returning `false` is correct for F1/F2/F3/F7 because vendor app must still:

- start video,
- start audio,
- take photo,
- handle any vendor-specific media behavior.

We only wiretap those buttons into telemetry.

### Endpoint semantics

Do not call `/api/sos-acknowledge` from the APK.

Use future endpoints:

| Endpoint | Meaning |
|----------|---------|
| `POST /api/bwc-companion/sos-trigger` | Device-side SOS press |
| `POST /api/bwc-companion/button-event` | F1/F2/F3/F7 passive telemetry |
| `POST /api/bwc-companion/telemetry` | Battery/storage heartbeat |

SOS trigger creates/opens incident. It must not clear or acknowledge it.

---

## Install / enable reality

APK install command later:

```powershell
adb install -r path\to\sos-interceptor.apk
```

But install is not enough. Accessibility service must be enabled on-device or via provisioning/ADB if allowed by the firmware.

Lab prove must include:

1. install APK,
2. enable Accessibility service,
3. start vendor GB/video call,
4. press SOS/F4,
5. confirm vendor app cannot block SOS,
6. press F1/F2/F3/F7,
7. confirm vendor media actions still work.

---

## Future MOB order

| Order | MOB | Job |
|-------|-----|-----|
| 1 | `mob-bwc-companion-f4-proof` | APK logs F4/F1/F2/F3/F7 locally; no backend dependency |
| 2 | `mob-bwc-companion-sos-trigger` | F4 posts signed SOS trigger to ME8 |
| 3 | `mob-bwc-companion-button-event` | Passive media button telemetry |
| 4 | `mob-bwc-companion-telemetry` | Battery/storage heartbeat |

Audio SIP remains parked.

---

## One line

**F4 is active intercept and returns true; F1/F2/F3/F7 are passive sniff and return false. This is the correct split for a lab companion APK, with backend SOS trigger added only after local key proof.**
