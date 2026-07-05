# ME8 Firmware Gold — primary lock

**Path:** `C:\Users\user\Desktop\Enterprise Mobility\ME8`  
**Snapshot:** `baseline/2026-07-06-me8-firmware-gold/`  
**Version:** `me8-firmware-gold-20260706`  
**Git tag:** `me8-firmware-gold-20260706`  
**Locked:** 2026-07-06 — Open All + pin canvas mirror checkpoint PASS  
**Files:** **2349** — VERIFY OK (2349/2349)  
**Git:** tag `me8-firmware-gold-20260706`  
**Video cache:** `video-wall.js?v=20260705-pin-mirror-complete`

This is the **primary** ME8 restore floor. Supersedes `me8-v1` for live video / pin work.

---

## What this lock contains

- Pin video: **canvas mirror** from wall (one WebSocket per cam)
- Open All: colocated pins show wall video
- BWC stopped overlay + six-locale i18n (from pin/video ops pass)
- `index.html` pin sync guards (no canvas strip loop)

**Not snapshotted:** `storage/secrets/`, `node_modules/`, `ship-build-test/`, `mobile-android/build/`.

**Frozen (MOB-APPLY + explicit file only):** `video-wall.js`, `index.html`, `fleet-ui.js`, `ptt-rx.js`, `pttServer.js`, `sipServer.js`, `psG711Audio.js`, `jsmpeg.min.js`.

---

## Restore (you type the phrase — AI must not unless you do)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\RESTORE-ME8-FIRMWARE-GOLD.ps1
.\RESTART-FLEET.bat
```

**AI rule:** Restore only when user types **`RUN RESTORE-ME8-FIRMWARE-GOLD`**.

---

## Verify

```powershell
.\VERIFY-ME8-FIRMWARE-GOLD.ps1
```

Expect: `VERIFY OK` + file count match.

**Agent post-mortem (what not to do):** `docs/MOB-DISC-FIRMWARE-GOLD-PIN-MIRROR.md`

---

## Re-lock (after authorized MOBs only)

```powershell
.\CREATE-ME8-FIRMWARE-GOLD.ps1
.\VERIFY-ME8-FIRMWARE-GOLD.ps1
```

Update this file with new date + file count + git tag.

---

## Fallback ladder

| Layer | How |
|-------|-----|
| **ME8 Firmware Gold** | `RESTORE-ME8-FIRMWARE-GOLD.ps1` (this lock) |
| **Git** | `git checkout me8-firmware-gold-20260706` |
| **me8-v1 (old)** | `RESTORE-ME8-V1.ps1` — pre-mirror, do not use for pin video |
| **Lab ops donor** | `RUN RESTORE-8WC-V2` on `Lab-8BWC-v2` |

---

## Run ME8

Dashboard: `http://<HOST>:3988`
