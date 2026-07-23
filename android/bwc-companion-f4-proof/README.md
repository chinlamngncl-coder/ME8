# BWC Companion F4 Proof

Headless Android AccessibilityService for BWC hardware key behavior.

## Scope

- `KEYCODE_F4`: posts SOS to ME8 and returns `true`.
- `KEYCODE_F1`, `KEYCODE_F2`, `KEYCODE_F3`, `KEYCODE_F7`: posts button event to ME8 and returns `false`.
- Desk target: `34020000001329000009` to `http://192.168.1.38:3988/api/bwc-companion/sos-trigger`.
- Token: `me8-companion-test-token` must match `FM_BWC_COMPANION_TOKEN`.
- Media button target: `http://192.168.1.38:3988/api/bwc-companion/button-event`.
- No battery/storage telemetry override.
- No Fleet, WVP, PTT, or SIP changes.
- Dashboard shows companion button events as a map toast.

## Expected Logcat Tags

```text
BWC_Service
```

Expected proof lines:

```text
BWC companion F4 proof service connected
Key event keyCode=KEYCODE_F4 action=ACTION_DOWN repeat=0
SOS F4 intercepted - posting to ME8
SOS POST result HTTP 200
BUTTON_F1 sniffed - posting to ME8 and passing to vendor app
BUTTON_F2 sniffed - posting to ME8 and passing to vendor app
BUTTON_F3 sniffed - posting to ME8 and passing to vendor app
BUTTON_F7 sniffed - posting to ME8 and passing to vendor app
BUTTON_F1_PRESSED POST result HTTP 200
```

## Lab Test

After installing the APK, enable `BWC Companion F4 Proof` in Android Accessibility settings. Then watch:

```powershell
adb logcat -s BWC_Service
```

During vendor live video, press:

- SOS / F4: should post to ME8 and not pass to vendor app.
- F1/F2/F3/F7: should post to ME8 and still pass to vendor app.
