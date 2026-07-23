# MOB DISC — Wake-up queue after “i am back” (2026-07-15)

**Date:** 2026-07-15 ~02:52  
**Status:** CONSOLIDATED PLAN — no code until future `MOB-APPLY`  
**Operator:** Sleep now. When operator returns and says **“i am back”**, resume this queue.  
**Theme:** Finish the important product lanes in order: companion buttons/info → FR → ZLM soft-latency → network.

---

## Wake Reminder Rule

When the operator says **`i am back`** after this sleep / 3h+ gap, remind briefly:

1. Start with **BWC companion button/info lane**.
2. Then **FR Seeta test + align/crop + professional UI**.
3. Then **ZLM/WVP soft live-chase prove**.
4. Then **network/AP stability**.
5. Security hardening is ship-blocking but not the first wake task unless operator opens security APPLY.

Do not nag ship/TOTP/SOS. This is a task reminder requested by the operator.

---

## Priority Order

### 1. BWC Companion Buttons + Info

**Goal:** Instant SOS and instant button/battery truth without relying on slow GB heartbeat.

Order:

| Step | MOB | Job |
|------|-----|-----|
| 1.1 | `mob-bwc-companion-f4-proof` | Minimal APK: Accessibility sees F4/F1/F2/F3/F7 during live video |
| 1.2 | `mob-bwc-companion-backend-routes` | Authenticated JSON routes for companion |
| 1.3 | `mob-bwc-companion-sos-trigger` | F4 creates ME8 SOS incident |
| 1.4 | `mob-bwc-companion-telemetry-override` | Battery/storage into `mergeBatteryTelemetry()` / `device-status` |
| 1.5 | `mob-bwc-companion-button-badges` | F1/F2/F3/F7 instant media badges |

Rules:

- F4 returns `true` in APK.
- F1/F2/F3/F7 return `false`.
- Do not use `/api/sos-acknowledge` for device trigger.
- Do not touch GB video / wall / PTT.

Reference:

- `MOB-DISC-BWC-COMPANION-MASTER-TASK.md`
- `MOB-DISC-BWC-COMPANION-F1-F4-F7-BUTTON-MAP.md`

---

### 2. FR: Seeta Test, Align Crop, Professional UI

**Goal:** Make FR reliable and professional, not raw lab crop cards.

Wake test:

1. Restart Fleet if needed.
2. Confirm Seeta sidecar health.
3. Watchlist **Re-embed gallery**.
4. Score / enroll-from-BWC with known person.

Then:

| Step | MOB | Job |
|------|-----|-----|
| 2.1 | `mob-fr-seeta-align-crop` | Use Seeta landmarks + OpenCV affine eye align |
| 2.2 | `mob-fr-iframe-or-sharp-pick` | Prefer I-frame / sharpest short window before crop/match |
| 2.3 | `mob-fr-watchlist-crop-ui-polish` | Professional watchlist/crop UI following Axiom theme |

UI direction:

- Identity cards, multi-photo face chips, clear quality gate.
- Side-by-side capture vs watchlist face.
- Professional Axiom theme; no raw lab look; no OEM brand copying.
- Keep 70% match bar unless separately changed.

Reference:

- `MOB-DISC-FR-MASTER-ALIGN-IFRAME-UI.md`
- `MOB-DISC-FR-MEDIATE-OPENVINO-VS-SEETA-ALIGN.md`

---

### 3. ZLM / WVP Soft Live-Chase Prove

**Goal:** Keep Lab WVP tiles near live edge without dragging the bar.

Already applied:

- `mob-wvp-lab-mpegts-live-chase`

Wake prove:

1. Hard refresh dashboard.
2. Play A+B.
3. Confirm hand latency stays around 2–5 seconds without manual bar babysitting.
4. Watch for `soft chase` / `live snap` log lines.
5. Report PASS/FAIL.

If FAIL:

- adjust soft rate / thresholds;
- do not jump to stamp/Jessibuca first unless evidence says so.

Reference:

- `MOB-APPLIED-WVP-LAB-MPEGTS-LIVE-CHASE.md`
- `MOB-DISC-WVP-SOAK-1H-PASS-2026-07-15.md`

---

### 4. Network / AP Stability

**Goal:** Remove Wi-Fi as the hidden cause of freeze / black tile / TV contention.

Tasks later:

- Prove clean soak without TV on same AP.
- Consider dedicated AP / SSID for BWC.
- Keep real LAN IP only, never 172.x.
- If button/video tests need accuracy, use quiet Wi-Fi window.

Reference:

- `MOB-DISC-WVP-SOAK-WIFI-VS-BYE.md`

---

## Ship-Blocking But Later

Security hardening before customer ship:

| MOB | Status |
|-----|--------|
| `mob-sec-epipe-log-guard` | APPLIED |
| `mob-sec-fleetlog-safe-console` | APPLIED |
| `mob-sec-evidence-upload-safe-name` | still required before ship |
| `mob-sec-uncaught-exit` | still required before ship |
| `mob-sec-sip-crypto-random` | still required before ship |
| `mob-sec-login-rate-lru` | still required before ship |

Do not ship customer pack until security harden genre is complete or explicitly skipped in writing.

Reference:

- `MOB-DISC-SEC-HARDEN-BEFORE-SHIP.md`

---

## One Line

**On “i am back”: start with companion button/info proof, then FR Seeta/align/pro UI, then WVP soft-chase prove, then network hardening — keep UI professional and Axiom-themed.**
