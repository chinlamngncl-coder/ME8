# ME8 POC/Demo — demo restore lock

**Path:** `C:\Users\user\Desktop\Enterprise Mobility\ME8`  
**Snapshot:** `baseline/2026-07-09-me8-poc-demo/`  
**Version:** `me8-poc-demo-20260709`  
**Locked:** 2026-07-09 — after VC BWC `libopenh264` checkpoint PASS + Server Config/UI genres  
**Files:** **2385** — VERIFY OK (2385/2385)  
**Git HEAD at lock:** `ca2a750` (working tree may be ahead of origin)  
**Video cache:** `video-wall.js?v=20260709-wall-claim`

This is a **POC/demo** restore floor — **not** `failed-live`, **not** me8-v2, and **not** a replacement for Firmware Gold as the primary live-video floor unless you choose it.

---

## What this lock contains

- VC BWC share: LGPL-safe **`libopenh264`** ingress (`lib/conferenceBwcIngress.js`)
- Server Config / Evidence Storage UI compact + dashboard panel close fix
- Display Room / Open all monitors = empty open (no auto-call)
- SOS ledger dispatch scope, evidence trim/redact LGPL path, and other genres since Firmware Gold
- Site config under `storage/` (devices, settings, users) — same pattern as Firmware Gold

**Not snapshotted:** `storage/secrets/`, `node_modules/`, `ship-build-test/`, `mobile-android/build/`, `vendor/ffmpeg-lgpl/ffmpeg.exe` (keep binary on disk; re-download via `scripts/download-ffmpeg-lgpl.ps1` if missing).

**Frozen (MOB-APPLY + explicit file only):** `video-wall.js`, `index.html`, `fleet-ui.js`, `ptt-rx.js`, `pttServer.js`, `sipServer.js`, `psG711Audio.js`, `jsmpeg.min.js`.

---

## Restore (you type the phrase — AI must not unless you do)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\RESTORE-ME8-POC-DEMO.ps1
.\RESTART-FLEET.bat
```

**AI rule:** Restore only when user types **`RUN RESTORE-ME8-POC-DEMO`**.

---

## Verify

```powershell
.\VERIFY-ME8-POC-DEMO.ps1
```

Expect: `VERIFY OK` + file count match.

---

## Re-lock (after authorized MOBs only)

```powershell
.\CREATE-ME8-POC-DEMO.ps1
.\VERIFY-ME8-POC-DEMO.ps1
```

Update this file with new date + file count.

---

## Fallback ladder

| Layer | How |
|-------|-----|
| **ME8 POC/Demo** | `RESTORE-ME8-POC-DEMO.ps1` (this lock) |
| **ME8 Firmware Gold** | `RESTORE-ME8-FIRMWARE-GOLD.ps1` — primary live/pin floor (2026-07-06) |
| **me8-v1 (old)** | `RESTORE-ME8-V1.ps1` |
| **Git** | remote backup when you run `lab-git-push-poc-demo` |

---

## Run ME8

Dashboard: `http://<HOST>:3988`
