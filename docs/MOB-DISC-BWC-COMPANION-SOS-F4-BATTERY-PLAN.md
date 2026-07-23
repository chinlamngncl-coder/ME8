# MOB DISC — BWC companion APK: F4 SOS + battery lead

**Date:** 2026-07-15 ~02:11  
**Status:** DISC ONLY — no Android project / no server hook until named `MOB-APPLY`  
**Trigger:** Google guide says AccessibilityService can intercept `KEYCODE_F4`; operator says SOS and battery leads are now found.  
**Scope:** Lab-only Android companion sidecar. Does **not** replace GB28181 live video, WVP, Fleet wall, PTT, or vendor app.

---

## Changed View

Earlier we parked the companion APK because locked BWCs often hide hardware keys from Android apps.

**New lead matters:** if ADB mapping proves the physical SOS button emits standard Android **`KEYCODE_F4`**, then an AccessibilityService is a realistic **lab spike** for SOS and battery telemetry.

Still not a product assumption until proved on the actual BWC:

| Requirement | Must prove |
|------------|------------|
| Key event | Accessibility receives `KEYCODE_F4` during video call |
| Consumption | Returning `true` prevents vendor app from swallowing or double-handling it |
| Boot | Service remains enabled after reboot / vendor app start |
| Network | HTTP SOS reaches ME8 even while video call is active |
| Battery | App survives Doze / OEM background kill |

---

## Important Correction To Google

Google says returning `true` “mathematically guarantees” the vendor app cannot block SOS.

**Too strong.** Correct wording:

> If Android delivers `KEYCODE_F4` to the enabled AccessibilityService first, returning `true` consumes that delivered event and prevents normal app delivery.

It does **not** guarantee:

- Firmware did not intercept the button before Android.
- Accessibility service is enabled.
- Device owner / kiosk policy allows key filtering.
- Vendor app is not reading the button from a native daemon or GPIO path.

So this is a **prove-first** path, not a guarantee.

---

## Endpoint Semantics

Do **not** POST to `/api/sos-acknowledge`.

That endpoint is for an operator to **clear / acknowledge** an existing SOS. A companion button press must **create / trigger** an SOS.

Future endpoint name should be something like:

| Endpoint | Meaning |
|----------|---------|
| `POST /api/bwc-companion/sos-trigger` | Device-side SOS trigger |
| `POST /api/bwc-companion/telemetry` | Battery/storage telemetry |

Security must include device identity + token/HMAC. Do not hardcode a shared naked URL in the APK for customer ship.

---

## Module Plan

### 1. SOS F4 Accessibility

Google XML / manifest direction is broadly right:

- `android:accessibilityFlags="flagRequestFilterKeyEvents"`
- `android:canRequestFilterKeyEvents="true"`
- service permission `android.permission.BIND_ACCESSIBILITY_SERVICE`
- override `onKeyEvent`
- if `KEYCODE_F4` and `ACTION_DOWN`, send SOS and return `true`

ME8 requirements:

- Debounce repeated `ACTION_DOWN` / long press.
- Local queue if Wi-Fi is down.
- Include `deviceId`, monotonic timestamp, APK version, battery snapshot.
- Server creates the SOS incident, same banner/ledger path as GB SOS.
- Never clear an incident from the device trigger.

### 2. Battery / Storage Telemetry

Use:

- `BatteryManager` for percent and charging state.
- `StatFs` for internal free storage.
- WorkManager or foreground-safe scheduler if OEM permits.

Reality:

- A silent app may be killed by OEM battery policy.
- For ship, we need install/provisioning instructions or MDM/OEM whitelist.

### 3. Audio SIP Client

Still **parked**.

Second SIP registration (`1001-audio`) is much riskier than F4/battery:

- dual identity per BWC
- Fleet/PTT route changes
- NAT/auth/device provisioning
- microphone/speaker permission and UX

Do not include audio SIP in the first companion APK spike.

---

## Priority

| Priority | Name | Job |
|----------|------|-----|
| P0 | `mob-bwc-companion-f4-proof` | Minimal APK: Accessibility logs F4 during video call; no backend yet |
| P1 | `mob-bwc-companion-sos-trigger` | Add signed HTTP trigger into ME8 SOS incident path |
| P2 | `mob-bwc-companion-telemetry` | Battery/storage heartbeat |
| P3 | `mob-bwc-companion-boot-survive` | Reboot / vendor app / Doze survival prove |
| Parked | `mob-bwc-companion-sip-audio` | Only after product decision |

---

## Product Boundary

This companion APK is an **edge sidecar**, not the live video engine.

Keep:

- video on GB28181 / WVP / Fleet path
- wall / Open All / pins untouched
- PTT untouched
- vendor private protocol still parked

The companion only supplements:

- SOS button reliability
- battery/storage truth

---

## Ship Gate Impact

If this APK becomes product:

- It creates a new install/provisioning step.
- It needs signed APK custody.
- It needs device token rotation.
- It needs a customer guide for enabling Accessibility, unless OEM/MDM can pre-enable it.
- It expands security review.

Do not silently add it to ship packs.

---

## One Line

**KEYCODE_F4 makes the companion APK worth a lab proof for SOS and battery, but first MOB must only prove Accessibility sees and consumes F4 during video; backend SOS trigger comes second, audio SIP stays parked.**
