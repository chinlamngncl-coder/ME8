# ME8 classic-PASS backup

**Version:** `me8-classic-pass-20260718`  
**Snapshot:** `baseline/2026-07-18-classic-pass/`  
**Also copied to:** `ME8-BACKUPS/2026-07-18-classic-pass/` (when CREATE succeeds)  
**Git at CREATE:** see `MANIFEST.json` → `gitCommit` (expect `main` after classic-revert genre)  
**Locked:** 2026-07-18  

## What this is

Safety floor **after Classic Fleet PASS** (Soft Open / lab WVP **off**), **before** clean WVP/ZLM return.

Includes (among product tree):
- Call always-on (`call-mic.js` Jul-10 lock)
- BWC-stop clear watching (`liveStreamPool.js`)
- Pin revive + pin dock no top-jam (`video-wall.js` / `index.html`)
- Classic env flags in `.env` snapshot: `FM_LAB_WVP=0`, Soft Open off
- Seeta / FR / redact / service scripts as present at CREATE time
- Classic-PASS paper discs

Does **not** replace Firmware Gold as the pin-mirror primary lock. Prefer this floor for “ops felt good after Soft Open mess.”

## Restore (you type this)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\RESTORE-ME8-CLASSIC-PASS-20260718.ps1
.\RESTART-FLEET.bat
```

AI runs restore **only** when you type: **`RUN RESTORE-ME8-CLASSIC-PASS-20260718`**

## Verify

```powershell
.\VERIFY-ME8-CLASSIC-PASS-20260718.ps1
```

## Create / refresh snapshot

```powershell
.\CREATE-ME8-CLASSIC-PASS-20260718.ps1
```

## Not in snapshot

- `node_modules/`, Python `.venv/`, Seeta model zip / `*.csta`
- `storage/secrets/`
- Soft Open UI storm freestyle (classic PASS = Soft Open off)
- Nested `fr-sidecar-seeta/vendor/` git

## Related

- `docs/MOB-DISC-CLASSIC-FLEET-PASS-20260718.md`
- `docs/MOB-DISC-BACKUP-CLASSIC-PASS-BEFORE-WVP-20260718.md`
- GitHub: `lab-classic-revert-genre` (`81c8929`)
