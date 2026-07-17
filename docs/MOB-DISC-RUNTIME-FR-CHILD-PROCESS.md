# MOB DISC — `mob-runtime-fr-child-process`

**Status:** APPLIED 2026-07-11  
**Genre:** Enterprise runtime — FR sidecar starts with C2 (no `START-FR.bat` for operators)

---

## What changed

| File | Change |
|------|--------|
| `lib/frSidecarClient.js` | `bootstrap()`, `isAutoStartEnabled()`; spawn uvicorn when `FM_FR_SIDECAR_AUTO=1` |
| `server.js` | Boot-time FR bootstrap + `/api/analytics/fr/health` uses `ensureReady` when AUTO |
| `scripts/me8-ship/Install-UbitronC2-Service.ps1` | Service env: `FM_FR_SIDECAR_AUTO=1` |
| `scripts/me8-ship/NEW-ME8-INSTALL.ps1` | Fresh `.env` gets `FM_FR_SIDECAR_AUTO=1` |
| `START-FR.bat` | Labelled lab / first-time install only |

**Not touched:** `fr-sidecar/app.py`, live wall, PTT, SOS.

---

## Operator habit

| Role | Action |
|------|--------|
| **Dispatcher** | Browser only — no `START-FR.bat` |
| **IT (once)** | `INSTALL-UBITRON-SERVICE.ps1` + first-time `START-FR.bat` only if Python packages never installed |
| **Lab** | `RESTART-FLEET.bat` or `START-FR.bat` when `FM_FR_SIDECAR_AUTO=0` |

---

## Existing service install (your PC)

Re-run **once** as Admin so the service picks up `FM_FR_SIDECAR_AUTO=1`:

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\INSTALL-UBITRON-SERVICE.ps1 -PauseAtEnd
```

Or add `FM_FR_SIDECAR_AUTO=1` to `.env` and `net stop UbitronC2` / `net start UbitronC2`.

---

## Mini test

1. No `START-FR.bat` window open  
2. `net stop UbitronC2` then `net start UbitronC2` (or reboot)  
3. Wait ~30s (first boot loads DeepFace)  
4. Browser → Analytics → Face watch → snaps appear  
5. Verify tab → “Face matching is ready.”

PASS/FAIL.

---

## Fix — `mob-runtime-fr-child-process-fix` (2026-07-11)

**Symptom:** FR watch runs minutes — **zero snaps** (not even one).

**Root cause:** Windows service ran as **LocalSystem** since ~01:47. It cannot spawn the Face Matching Python under your **Desktop** user folder. Port **8765** never opened; bootstrap never logged.

| File | Fix |
|------|-----|
| `lib/frSidecarClient.js` | Log spawn/stderr to `storage/fr-sidecar-stderr.log`; longer boot wait (3 min); clear `python_missing` error |
| `scripts/me8-ship/Install-UbitronC2-Service.ps1` | Service runs as **your Windows user** (password once at install); sets `FM_FR_PY` absolute path |
| `.env` | `FM_FR_PY=...\fr-sidecar\.venv\Scripts\python.exe` |

### What you do (one time, Admin)

1. Right-click **`INSTALL-UBITRON-SERVICE.ps1`** → Run with PowerShell (Admin)  
   — or open Admin PowerShell and run:
   ```powershell
   cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
   .\INSTALL-UBITRON-SERVICE.ps1 -PauseAtEnd
   ```
2. When Windows asks for your **sign-in password**, enter it (same as unlocking the PC).
3. Wait until you see **UBITRON C2 SERVICE OK**.
4. Open browser → Analytics → Face watch → leave live on **2+ minutes**.
5. Snapshot rail should fill with **many** face crops (every few seconds when a face is visible).

**Until then (quick lab):** double-click **`START-FR.bat`** and leave that window open — snaps return immediately.

**Logs if still stuck:** `storage\fr-sidecar-stderr.log` and `storage\service-stdout.log` (look for `fr sidecar ready`).

---

## After PASS

`MOB-APPLY lab-git-push-runtime` — commit Windows service + FR child-process genre.
