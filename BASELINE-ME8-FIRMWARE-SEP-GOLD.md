# ME8 Firmware Sep Gold — restore floor for the audit fix campaign

**Path:** `C:\Users\user\Desktop\Enterprise Mobility\ME8`
**Snapshot:** `baseline/2026-09-02-me8-firmware-sep-gold/`
**Version:** `me8-firmware-sep-gold-20260902`
**Git tag:** `me8-firmware-sep-gold-20260902`
**Git commit:** `97d594e` (`lab-checkpoint-20260902-pre-sep-gold`)
**Locked:** 2026-09-02 — before Phase 1 of `docs/MOB-DISC-CONSOLIDATED-AUDIT-FIX-PLAN-20260902.md`
**Predecessor:** `me8-firmware-gold-20260706` (kept as deep fallback)
**Video cache:** `video-wall.js?v=20260902-sos-helper-shut-wall-and-pin-v1`

This is the **primary** restore floor while the consolidated audit MOBs are being applied.

---

## What this lock contains (operator PASS state)

- SOS helpers: `SOS-HELPER-SD-RECORD-SAME-AS-MAP-V1`, `SOS-HELPER-SHUT-WALL-AND-PIN-V1`
- Investigation Sync: `INV-SYNC-EOF-STOP-YELLOW-V1`, sector-stop, one-clock, cam-own SOS index
- PTT evidence recorder, SOS nearby fixed cams, Axiom datetime helper
- All Firmware Gold (2026-07-06) pin canvas mirror / Open All behaviour
- Consolidated audit fix plan (paper) and both Desktop audit reports referenced by it

**Not snapshotted:** `storage/secrets/`, `node_modules/`, `ship-build-test/`, `mobile-android/build/`.

**Frozen (MOB-APPLY + user names the file):** `video-wall.js`, `index.html` pin sync, `fleet-ui.js`, `ptt-rx.js`, `pttServer.js`, `psG711Audio.js`, `jsmpeg.min.js`.

---

## Restore (user types the phrase — AI must not unless you do)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\RESTORE-ME8-FIRMWARE-SEP-GOLD.ps1
.\RESTART-FLEET.bat
```

**AI rule:** Restore only when user types **`RUN RESTORE-ME8-FIRMWARE-SEP-GOLD`**.

Git alternative (same state): `git checkout me8-firmware-sep-gold-20260902 -- .`

---

## Verify

```powershell
.\VERIFY-ME8-FIRMWARE-SEP-GOLD.ps1
```

Expect: `VERIFY OK` + file count match.

---

## Re-lock (after a phase of the audit plan PASSes)

```powershell
.\CREATE-ME8-FIRMWARE-SEP-GOLD.ps1
.\VERIFY-ME8-FIRMWARE-SEP-GOLD.ps1
```

Update this file with new date + file count + git tag.
