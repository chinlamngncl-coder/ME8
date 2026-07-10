# ME8 POC/Demo — demo restore lock

**Path:** `C:\Users\user\Desktop\Enterprise Mobility\ME8`  
**Snapshot:** `baseline/2026-07-09-me8-poc-demo/`  
**Version:** `me8-poc-demo-20260711-fr-genre`  
**Locked:** 2026-07-11 — **FR genre** (DeepFace sidecar, live watch, 16-slot snap rail+metadata, standby PTT, ledger, alerts) — **pre-engine-pivot rollback floor**  
**Files:** **2519** — VERIFY OK (2519/2519)  
**Git HEAD at lock:** `3c865d9` (FR code) · manifest commit follows baseline lock  
**Git tag:** `me8-fr-genre-20260711`  
**Video cache:** `video-wall.js?v=20260709-wall-claim` · `fr-alarm.js?v=20260710-rail-16-meta`

This is a **POC/demo** restore floor — **not** `failed-live`, **not** me8-v2, and **not** a replacement for Firmware Gold as the primary live-video floor unless you choose it.

---

## What this lock contains

- **Full FR genre (DeepFace):** `fr-sidecar/`, `lib/fr*.js`, analytics UI, enroll, offline video, snap ledger, standby PTT, HQ alert bar
- VC BWC share: LGPL-safe **`libopenh264`** ingress (`lib/conferenceBwcIngress.js`)
- Server Config / Evidence Storage UI genres
- Site config under `storage/` (devices, settings, users) — same pattern as prior locks

**Not snapshotted:** `storage/secrets/`, `storage/fr-blacklist/` (watchlist data), `storage/fr-snap-ledger/` (crop archive), `node_modules/`, `fr-sidecar/.venv/`, `ship-build-test/`, `mobile-android/build/`, `vendor/ffmpeg-lgpl/ffmpeg.exe` (keep binary on disk; re-download via `scripts/download-ffmpeg-lgpl.ps1` if missing).

**Frozen (MOB-APPLY + explicit file only):** `video-wall.js`, `index.html`, `fleet-ui.js`, `ptt-rx.js`, `pttServer.js`, `sipServer.js`, `psG711Audio.js`, `jsmpeg.min.js`.

---

## Rollback ladder (FR engine pivot)

| Layer | When | Command |
|-------|------|---------|
| **1 — Baseline (100%)** | Byte-for-byte restore of snapshotted code + site config | You type **`RUN RESTORE-ME8-POC-DEMO`** → `.\RESTORE-ME8-POC-DEMO.ps1` → `.\RESTART-FLEET.bat` |
| **2 — Verify** | Confirm live tree matches lock | `.\VERIFY-ME8-POC-DEMO.ps1` → expect **VERIFY OK** + **2519/2519** |
| **3 — Git** | Code-only rollback (no storage watchlist) | `git checkout me8-fr-genre-20260711` or `git checkout 3c865d9` |
| **4 — Firmware Gold** | Live/pin floor only (loses FR genre) | `RESTORE-ME8-FIRMWARE-GOLD.ps1` |

**Before engine POC:** this lock is the **mandatory** rollback point. New sidecar must run **parallel** (`FM_FR_ENGINE` flag) — do not delete DeepFace until cutover PASS.

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

Expect: `VERIFY OK` + **2519/2519** file count match.

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
| **ME8 POC/Demo (this lock)** | `RESTORE-ME8-POC-DEMO.ps1` |
| **ME8 Firmware Gold** | `RESTORE-ME8-FIRMWARE-GOLD.ps1` — primary live/pin floor (2026-07-06) |
| **me8-v1 (old)** | `RESTORE-ME8-V1.ps1` |
| **Git** | `git checkout me8-fr-genre-20260711` |

---

## Run ME8

Dashboard: `http://<HOST>:3988`  
FR sidecar: `START-FR.bat` (or fleet auto-start per `run.js`)
