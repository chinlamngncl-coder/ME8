# MOB DISC — Full wake-up queue / not-done ledger (2026-07-15)

**Date:** 2026-07-15 ~02:54  
**Status:** Consolidated queue — no code until future `MOB-APPLY`  
**Trigger:** Operator wants final confirmation of what is still not done, in case items were missed before sleep.  
**Wake phrase:** When operator says **“i am back”**, resume from this ledger.

---

## Done Tonight

| Item | Status |
|------|--------|
| WVP modern A+B soak | **PASS** ~61.5 min, no mid BYE |
| WVP soft live-chase | **APPLIED** `mob-wvp-lab-mpegts-live-chase`; prove still pending after refresh |
| Fleet EPIPE guard | **APPLIED** `mob-sec-epipe-log-guard` |
| Fleet log console guard | **APPLIED** `mob-sec-fleetlog-safe-console` |
| BWC button SIP log check | **DONE / inconclusive** — no Fleet XML found; WVP only record segment completion |
| Wake queue first draft | Written |

---

## Must Do First After “i am back”

### 1. BWC companion button / info lane

**Why first:** we now have real ADB key mapping and this solves the SOS-during-video + slow battery/report problem.

| Order | MOB | Not done yet |
|-------|-----|--------------|
| 1.1 | `mob-bwc-companion-f4-proof` | Build minimal APK and prove Accessibility receives F4/F1/F2/F3/F7 during live video |
| 1.2 | `mob-bwc-companion-backend-routes` | Add authenticated routes: SOS trigger, button event, telemetry |
| 1.3 | `mob-bwc-companion-sos-trigger` | F4 creates ME8 SOS incident; **not** `/api/sos-acknowledge` |
| 1.4 | `mob-bwc-companion-telemetry-override` | Battery/storage into `mergeBatteryTelemetry()` / `device-status` |
| 1.5 | `mob-bwc-companion-button-badges` | F1/F2/F3/F7 instant media badges; media keys return `false` in APK |
| 1.6 | `mob-bwc-companion-boot-survive` | Reboot / Doze / OEM kill survival |

Rules:

- `F4` returns `true`.
- `F1/F2/F3/F7` return `false`.
- GB video path stays untouched.
- Android SIP audio remains parked.

References:

- `MOB-DISC-BWC-COMPANION-MASTER-TASK.md`
- `MOB-DISC-BWC-COMPANION-F1-F4-F7-BUTTON-MAP.md`

---

### 2. FR lane

**Why second:** Seeta was wired but not operator-tested. Crop quality and UI are still raw.

| Order | MOB / task | Not done yet |
|-------|------------|--------------|
| 2.0 | Wake Seeta prove | Restart Fleet if needed; confirm Seeta; Watchlist **Re-embed gallery**; Score/enroll known face |
| 2.1 | `mob-fr-seeta-align-crop` | Use Seeta landmarks + OpenCV affine eye-align before embedding |
| 2.2 | `mob-fr-iframe-or-sharp-pick` | Prefer I-frame / sharpest short window before crop/match |
| 2.3 | `mob-fr-watchlist-crop-ui-polish` | Professional Axiom-themed watchlist/crop UI |
| 2.4 | `mob-fr-rail-blur-reject` | If blur/mush continues after sharp-pick |

UI target:

- professional Axiom theme;
- identity cards + multi-photo face chips;
- side-by-side capture vs watchlist face;
- quality gate before save;
- no raw lab crop look;
- no OEM names copied into UI.

References:

- `MOB-DISC-FR-MASTER-ALIGN-IFRAME-UI.md`
- `MOB-DISC-FR-MEDIATE-OPENVINO-VS-SEETA-ALIGN.md`

---

### 3. WVP / ZLM soft live-chase prove

**Why third:** code is applied; only operator proof remains.

| Task | Not done yet |
|------|--------------|
| Hard refresh dashboard | Needed to load `?v=20260715-live-chase` |
| Play A+B | Check lab tiles |
| Observe hand latency | Target ~2–5 sec without dragging |
| Watch lab log | `soft chase` / `live snap` lines |
| Report PASS/FAIL | If FAIL, tune thresholds before stamp/Jessibuca |

Do not jump to stamp/Jessibuca until this prove is done.

References:

- `MOB-APPLIED-WVP-LAB-MPEGTS-LIVE-CHASE.md`
- `MOB-DISC-WVP-SOAK-1H-PASS-2026-07-15.md`

---

### 4. Network / AP stability

**Why fourth:** the TV/Wi-Fi blip looked like client/network, not media teardown.

Not done:

- prove WVP A+B with quiet Wi-Fi / no TV load;
- decide if BWC needs dedicated AP / SSID;
- keep using real LAN IP only (`192.168.1.38` class), never 172.x;
- use quiet Wi-Fi window for future button/SOS proof.

Reference:

- `MOB-DISC-WVP-SOAK-WIFI-VS-BYE.md`

---

## Security Queue Before Customer Ship

Already done:

- `mob-sec-epipe-log-guard`
- `mob-sec-fleetlog-safe-console`

Still not done:

| MOB | Why |
|-----|-----|
| `mob-sec-evidence-upload-safe-name` | Stop upload path traversal via `originalname` |
| `mob-sec-uncaught-exit` | Real fatal exceptions should exit after restart manager proof |
| `mob-sec-sip-crypto-random` | Replace SIP `Math.random` call-id/tag/SN in `server.js` |
| `mob-sec-login-rate-lru` | Cap login attempt memory |

Rule: do not ship customer pack until these are done or explicitly skipped in writing.

References:

- `MOB-DISC-SEC-HARDEN-BEFORE-SHIP.md`
- `MOB-DISC-SEC-GOOGLE-FOUR-FINDINGS-PLAN.md`

---

## BWC AES / Vendor Protocol Queue

Not done:

| Item | Status |
|------|--------|
| Prove SDP `RTP/AVP` vs `RTP/SAVP` from cam | Pending |
| Vendor I-frame AES-256 doc / key method | Pending; V1.3 PDF did **not** contain AES |
| Decrypt-before-decode design | Pending vendor proof |
| Private GB+SDK mode | **Parked** because vendor path cannot stop video |

Future names:

- `mob-bwc-sdp-avp-savp-prove`
- `mob-bwc-aes-vendor-doc-prove`
- `mob-bwc-iframe-aes256-decrypt`

References:

- `MOB-DISC-BWC-SDP-AVP-VS-IFRAME-AES256.md`
- `MOB-DISC-BWC-VENDOR-PRIVATE-VS-GB-ONLY.md`

---

## BWC Physical Button GB Report

Not done:

- clean raw SIP capture on Fleet 5060 or Wireshark;
- determine whether physical Video/Audio/Photo buttons emit `Alarm`, `DevStatus`, or nothing;
- optional short raw-message probe:

`mob-bwc-button-sip-raw-log`

Current test result:

- no Fleet XML found;
- WVP only showed ZLM record segment completion;
- companion APK may be more reliable for button truth.

Reference:

- `MOB-DISC-BWC-VIDEO-BUTTON-GB-REPORT-TEST-20260715.md`

---

## Parked / Do Not Do First

| Item | Why parked |
|------|------------|
| Android SIP audio client | Too much SIP identity/PTT mess |
| MediaPipe + OpenVINO full FR rewrite | Only if Seeta + align fails |
| Jessibuca | Only if mpegts soft-chase fails |
| ZLM `modify_stamp=1` | Second knife after soft-chase proof |
| Vendor private protocol live core | Cannot stop video; do not merge |
| Wall / Open All / pin / PTT changes | Critical path; not part of these lanes |

---

## Wake Order In One Line

**When operator says “i am back”: do BWC companion buttons/info first, then FR Seeta+align+professional UI, then WVP soft-chase prove, then network/AP, while keeping security hardening queued before customer ship.**
