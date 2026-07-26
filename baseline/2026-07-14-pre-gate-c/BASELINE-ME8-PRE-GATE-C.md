# ME8 pre-Gate-C backup

**Version:** `me8-pre-gate-c-20260714`  
**Snapshot:** `baseline/2026-07-14-pre-gate-c/`  
**Also copied to:** `ME8-BACKUPS/2026-07-14-pre-gate-c/`  
**Git branch:** `backup/20260714-pre-gate-c`  
**Git tag:** `me8-pre-gate-c-20260714`  
**Locked:** 2026-07-14  

## What this is

Safety backup **before Gate D / more MVP wall work**.

Includes:
- Firmware Gold live path (wall / pins / pool)
- Gate B ZLM lab (test page + relay)
- Gate C `liveMediaAdapter` (side ZLM path; wall still old player)

Does **not** replace Firmware Gold as the primary live floor.

## Restore (you type this)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\RESTORE-ME8-PRE-GATE-C.ps1
.\RESTART-FLEET.bat
```

AI runs restore **only** when you type: **`RUN RESTORE-ME8-PRE-GATE-C`**

## Verify

```powershell
.\VERIFY-ME8-PRE-GATE-C.ps1
```

## Not in snapshot

- `node_modules/`, Python `.venv/`, Seeta model zip / `*.csta`
- `storage/secrets/`
