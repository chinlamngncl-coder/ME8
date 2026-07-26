# MOB DISC — Companion battery poll (what / risk) · why Record button does not toast

**Date:** 2026-07-23  
**Status:** DISC only — **no APPLY**  
**Ask:** Explain companion battery poll (what it does + risks). Also: GB has `Record`, but pressing Record on BWC **never toasts** on Axiom (tested many times).  
**Related:** `MOB-DISC-GB-BATTERY-STATUS-LEADS-20260723.md` · companion proof APK `android/bwc-companion-f4-proof/`

---

## Part A — Companion battery poll (proposed `BWC-COMPANION-BATTERY-POLL-V1`)

### What it would do (plain English)

A small Android app (or an extension of today’s **BWC Companion**) runs **on the BWC**:

1. Every N seconds (e.g. 30–60s), read phone/BWC battery via Android **`BatteryManager`** (same API any Android app uses).  
2. HTTP POST to Fleet:  
   `POST /api/bwc-companion/telemetry`  
   with `{ cameraId, battery: "63%" }` + shared token header.  
3. Fleet already has this API → `mergeBatteryTelemetry` → dashboard `device-status` → pin battery %.

**It does not** talk GB28181, YDT, or WVP. Battery becomes an **HTTP side channel** from the device OS to Axiom.

Today’s F4 proof companion (`android/bwc-companion-f4-proof`) already posts SOS/buttons; README says **no battery override yet**. Poll = add that missing piece.

### What it does *not* do

- Does not fix video stop / PTT / SOS by itself.  
- Does not invent GB `<Battery>` XML.  
- Does not replace YDT for GPS/buttons unless you also wire those events (companion already can for buttons).

### Risks

| Risk | Severity | Notes |
|------|----------|--------|
| **Must install + enable companion APK** on every BWC | High ops | Accessibility / background service; vendor ROM may block or kill it |
| **Token / LAN security** | Medium | Needs `FM_BWC_COMPANION_TOKEN`; anyone with token can spoof battery/camId if exposed |
| **Wrong camId mapping** | Medium | Companion must be configured with correct device id (lab already hard-codes kk in proof README) |
| **Battery drain / wake locks** | Low–Med | Poll interval too aggressive = extra radio wake |
| **Two sources fight** | Low | If YDT/WVP later send battery too, UI merge already prefers last non-empty; usually OK |
| **OEM forbids sideload** | High on some fleets | Then companion path is blocked — only vendor firmware or YDT left |
| **False trust** | Low | Shows OS battery, not “GB certified” telemetry |

### When companion is the right answer

- You must stay **GB video → WVP** and cannot rely on YDT for %.  
- Vendor will not put Battery in DeviceStatus.  
- You accept installing our companion on lab/customer units.

### When it is the wrong answer

- Customer forbids third-party APK on BWC.  
- You already run **GB+YDT** and battery works — keep YDT; don’t add another pipe.

**Risk summary:** Low platform risk (API exists); **medium–high device/ops risk** (install, token, OEM). Not a free server-only fix.

---

## Part B — Why Record on BWC does not toast (even if GB has `Record`)

### What “GB has Record” means

In **DeviceStatus** XML, `<Record>ON|OFF</Record>` is a **standard-ish status field** (encode/record flags). It means “device reports recording state in status,” **not** “Axiom will toast when officer presses the Record key.”

Those are different products:

| Layer | What happens |
|-------|----------------|
| BWC button | Starts **local SD / device** recording |
| GB DeviceStatus | May later report `<Record>ON</Record>` if firmware maps SD record to that flag (many BWCs also set Record ON when **HQ live encode** is up — ambiguous) |
| Axiom toast | Only if our UI gets a **clear edge event** and is **allowed** to show it |

### Why your toast stays silent (code + product facts)

**1) UI deliberately ignores DeviceStatus for the red REC chrome**

In `public/index.html` / `dashboard-boot.js` `setTelemetryUi`:

```text
// This BWC reports Record ON for HQ live encode too;
// do not show REC from DeviceStatus alone.
updateBwcRecordingState(camId, false);
```

So wall/pin **REC dots** are **forced off** for any `device-status.recording` from GB status. That was intentional to stop false “recording” while Soft Open / live is up.

Pin telemetry row **can** still flip SD Record On/Off in the popup if `recording === '1'` arrives — that is **not** the same as a map toast.

**2) Toast path is `bwc-activity-tag`, not raw GB**

Server `observeBwcActivityStatus` emits `bwc-activity-tag` only when `recording` **changes** (`0→1` or `1→0`) on a `device-status` / companion payload.  
Dashboard listens and shows map toast (“Recording started/stopped”).

If Fleet **never receives** a recording edge (WVP-only, no YDT, status stuck OFF, or always already ON), **no toast**.

**3) Voice “speak when SD recording starts” defaults OFF**

Settings: `speakRecStart` / `speakRecStop` default **false**. Even if `device-status` edges arrive, TTS won’t speak unless you enable those checkboxes.

**4) Dual-protocol / WVP handoff**

With video on WVP, DeviceStatus queries/replies often **don’t** carry a clean SD-record edge to Fleet when you press Record. Same class of problem as battery: **status field exists in the standard; our live path doesn’t deliver a trustworthy edge.**

**5) Ambiguous meaning of `<Record>`**

Many firmwares set Record ON for **platform live pull**, not only **local SD record**. That is exactly why Axiom **refuses** DeviceStatus alone for REC chrome — your “no toast” is partly **by design**, not only a miss.

### So: “GB has Record” ≠ “toast when I press Record”

You’ve tested many times — that matches the code. The gap is **product wiring** (edge event + toast policy), not “GB forgot the Record tag name.”

---

## What would make Record toast work (leads — not APPLY yet)

| Lead | Idea | Risk |
|------|------|------|
| **Companion button** | Record key → `POST /api/bwc-companion/button-event` → toast (F1–F3 path already toasts buttons) | Needs keycode map; install APK |
| **YDT record event** | Dual protocol carries explicit start/stop | Needs YDT on |
| **Trust DeviceStatus edges carefully** | Only toast on `0→1` when **not** live, or only from companion | False positives if Record=live encode |
| **Separate SD vs Encode** | Ask vendor for distinct tags (SDRecord vs Encode) | Vendor firmware |
| **Re-enable activity-tag toast only** | Ensure Fleet gets edges; leave REC dots gated | Medium false toast risk |

**Recommendation (one path):** Treat **Record toast** like battery — **companion or YDT button event**, not “believe GB DeviceStatus Record.” Keep the REC-dot gate until vendor separates SD vs live encode.

Named later (when you want):  
`MOB-APPLY BWC-COMPANION-RECORD-TOAST-V1` (button → activity toast)  
and/or  
`MOB-APPLY BWC-COMPANION-BATTERY-POLL-V1` (poll %).

Do **not** blindly undo `updateBwcRecordingState(..., false)` — that reopens false REC during live.

---

## Operator one-screen

| Topic | Answer |
|-------|--------|
| Companion battery poll | APK reads OS battery → HTTP to Fleet → pin % |
| Main risk | Must install/trust companion + token; OEM may block |
| Record toast missing | Expected today: UI blocks DeviceStatus for REC chrome; toast needs activity edge; voice defaults off; WVP may not deliver edges |
| Next | Decide companion allowed on BWC? Then battery poll and/or Record key → toast APPLYs |

---

## One line

**Companion battery poll = Android % over HTTP to Fleet (install/token risk). Record toast silence is mostly intentional + missing edge events — GB `<Record>` alone will not toast.**
