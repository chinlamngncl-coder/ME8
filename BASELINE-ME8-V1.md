# Mobility Enterprise 8BWC — baseline me8-v1

**Path:** `C:\Users\user\Desktop\Enterprise Mobility\ME8`  
**Snapshot:** `baseline/2026-07-01-me8-v1/`  
**Version:** `me8-v1`  
**Locked:** 2026-07-01 (pre-ZLK/MVP integration checkpoint)  
**Files:** **2345** — VERIFY OK (2345/2345)  
**Git:** `420b354` on `main` (GitHub fallback)  
**Seeded from:** `Lab-8BWC-v2` / lock `8wc-v2` (2026-06-30)

**Interim lock** — full commercial review gate (`docs/google-feedback-discussion/05-REVIEW-GATE-BEFORE-SHIP.md`) still pending for final ship sign-off.

---

## What this lock contains

ME8 enterprise lane through session MOBs (SOS voice guard, signal-lost overlay, pin-stop keep-visible, operator voice, settings/session sync, security hardening).

**Not snapshotted:** `storage/secrets/` (encrypted vault — site-specific), `node_modules/`, `ship-build-test/`, `mobile-android/`.

**Frozen ops heart (extra caution):** `video-wall.js`, `fleet-ui.js`, `ptt-rx.js`, `pttServer.js`, `sipServer.js`, `psG711Audio.js`, `jsmpeg.min.js`.

---

## Restore (you run — AI must not unless you type the phrase)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\baseline\2026-07-01-me8-v1\RESTORE-ME8-V1.ps1
.\RESTART-FLEET.bat
```

Or from ME8 root:

```powershell
.\RESTORE-ME8-V1.ps1
.\RESTART-FLEET.bat
```

**AI rule:** Restore only when user types **`RUN RESTORE-ME8-V1`**.

---

## Verify

```powershell
.\VERIFY-ME8-V1.ps1
```

Expect: `VERIFY OK` + file count match.

---

## Re-lock (after authorized MOBs)

```powershell
.\CREATE-ME8-V1.ps1
.\VERIFY-ME8-V1.ps1
```

Update this file with new date + file count.

---

## Fallback ladder

| Layer | How |
|-------|-----|
| **ME8 me8-v1** | `RESTORE-ME8-V1.ps1` (this lock) |
| **GitHub** | `git checkout 420b354` (code only — no storage) |
| **Lab ops donor** | `RUN RESTORE-8WC-V2` on `Lab-8BWC-v2` |
| **Trial ship** | `RUN RESTORE-TRIAL-GOLD` on `SaaS Mobility` `:3888` |

---

## Run ME8

Dashboard: `http://<HOST>:3988`

See `README-ME8.md` and `docs/ME8-ROADMAP.md`.
