# MOB DISC - Lab RESTART-FLEET Prefer Service

**MOB:** `mob-lab-restart-fleet-prefer-service`  
**Date:** 2026-07-16  
**Status:** APPLIED  
**Code touched:**
- `RESTART-FLEET.bat`
- `restart-fleet-prefer-service.ps1` (new)
- `kill-fleet-ports.ps1` (message fix + null-safe enumerator)

---

## Decision

Keep Windows service `UbitronC2` for ship/enterprise testing.  
Do **not** uninstall it for lab convenience.

Solve the console fight by making `RESTART-FLEET.bat` prefer the service when it exists.

---

## Behavior

```text
RESTART-FLEET.bat
  -> if UbitronC2 installed:
       restart service (elevate once / UAC Yes if needed)
       leave background service running
       do NOT start console node
  -> if UbitronC2 NOT installed:
       old console path (kill ports + node server.js)
```

Exit codes from `restart-fleet-prefer-service.ps1`:

| Code | Meaning |
|---|---|
| 0 | Service restarted OK |
| 1 | Service restart failed |
| 2 | No service — use console |

---

## Operator use

1. Double-click `RESTART-FLEET.bat`
2. If Windows asks Yes once, click Yes
3. Open `http://192.168.1.38:3988`
4. Close the bat window after service restart (service stays up)

---

## Reminder lock

If Admin/service vs console trouble appears again: service stays for ship; use this prefer-service restart path. Do not uninstall unless user explicitly orders it.
