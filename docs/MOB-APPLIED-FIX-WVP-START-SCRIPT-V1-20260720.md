# MOB-APPLIED — Fix WVP start script parse error

**Date:** 2026-07-20  
**MOB:** `MOB-APPLY-FIX-WVP-START-SCRIPT-V1`  
**Scope:** `scripts/START-WVP-LAB.ps1` only.

---

## Problem

`START-WVP-LAB.bat` died instantly on Windows PowerShell 5.1:

```
The string is missing the terminator: ".
```

Cause: Unicode em-dash (`U+2014`) inside a double-quoted `Write-Host` string (line 100). PS 5.1 read the UTF-8 file without BOM as system code page; the em-dash bytes were misread as `"`, which closed the string early and broke parsing at line 105. WVP never started.

---

## Change

Replaced em-dashes with ASCII hyphen `-` on:

- Line 1 (comment)
- Line 100 (`Write-Host` help text)

No logic change. Docker / compose commands unchanged.

---

## Operator test

1. Docker Desktop running.
2. Double-click **`START-WVP-LAB.bat`** in ME8 folder.
3. Window should show bringup lines and end with **OK - modern WVP lab is up.** (or containers started + log hints).
4. Browser: `http://192.168.1.38:18080` — **admin / admin**.
