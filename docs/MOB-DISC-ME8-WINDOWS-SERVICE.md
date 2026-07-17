# MOB DISC — `mob-me8-windows-service`

**Status:** APPLIED 2026-07-11  
**Genre:** Enterprise runtime — C2 as Windows service (no console for operators)

---

## What changed

| File | Role |
|------|------|
| `scripts/me8-ship/Install-UbitronC2-Service.ps1` | Register + start **UbitronC2** service via NSSM |
| `scripts/me8-ship/Uninstall-UbitronC2-Service.ps1` | Remove service |
| `scripts/me8-ship/Get-Nssm.ps1` | Resolve or download NSSM 2.24 once |
| `INSTALL-UBITRON-SERVICE.ps1` | IT wrapper (run as Admin) |
| `UNINSTALL-UBITRON-SERVICE.ps1` | IT wrapper |
| `START-UBITRON-SERVICE.bat` / `STOP-UBITRON-SERVICE.bat` | `net start/stop UbitronC2` |
| `RESTART-FLEET.bat` | Labelled **lab console mode** only |
| `pack/me8-fresh/README.txt` | Enterprise install path |

**Service name:** `UbitronC2` · **Display:** Ubitron Mobility C2 · **Auto-start:** yes  
**Logs:** `storage/service-stdout.log`, `storage/service-stderr.log`

**Not in this MOB:** FR sidecar auto-start (MOB #2 `mob-runtime-fr-child-process`).

---

## IT install (customer server)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\NEW-ME8-INSTALL.ps1          # if fresh
# Run PowerShell as Administrator:
.\INSTALL-UBITRON-SERVICE.ps1
.\VERIFY-ME8-FRESH.ps1
```

Operators: bookmark **Operator portal URL** — no `.bat`.

---

## Rollback

```powershell
.\UNINSTALL-UBITRON-SERVICE.ps1   # Admin
.\RESTART-FLEET.bat               # lab console mode
```

---

## Mini test

1. Admin: `INSTALL-UBITRON-SERVICE.ps1` → **UBITRON C2 SERVICE OK**
2. Close all CMD windows → `http://localhost:3988` still loads
3. Reboot → site still up (service auto-start)
4. `net stop UbitronC2` → site down; `net start UbitronC2` → back

PASS/FAIL.
