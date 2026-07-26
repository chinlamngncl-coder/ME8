# ME8 pre-Settings-UI-fallback backup

**Version:** `me8-pre-settings-ui-fallback-20260726`  
**Snapshot:** `baseline/2026-07-26-pre-settings-ui-fallback/`  
**Also copied to:** `ME8-BACKUPS/2026-07-26-pre-settings-ui-fallback/`  
**Locked:** 2026-07-26  

## What this is

Safety checkpoint **before** Target A Settings UI theme fallback (`SETTINGS-UI-THEME-FALLBACK-PRE-SAAS-CSS-V1`).

Freezes current lab with functional progress already done after the last genre push, including:

- SaaS Step 2 chrome (`DEPLOYMENT_MODE`, SSL scaffold HTML, related JS)
- Tactical / license MOBs and tools
- WVP / Fleet / Settings code as of lock time
- Current (broken) Settings CSS — intentional; this backup is the “go back” if Target A fails

Does **not** replace Firmware Gold or classic-PASS as live floors. This is a **pre-UI-fallback** safety net only.

## Restore (you type this)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\RESTORE-ME8-PRE-SETTINGS-UI-FALLBACK.ps1
.\RESTART-FLEET.bat
```

AI runs restore **only** when you type: **`RUN RESTORE-ME8-PRE-SETTINGS-UI-FALLBACK`**

## Verify

```powershell
.\VERIFY-ME8-PRE-SETTINGS-UI-FALLBACK.ps1
```

## Create (already applied)

```powershell
.\CREATE-ME8-PRE-SETTINGS-UI-FALLBACK.ps1
```

Snapshot engine scripts live as `*-SNAP.ps1` under the baseline folder (root wrappers call them).

## Not in snapshot

- `node_modules/`, Python `.venv/`, Seeta model zip / `*.csta`
- Full evidence archives under `storage/` (config JSON + `mobility.db` + license only)
- Nested `baseline/*` older snapshots (avoid recursion)
- `storage/secrets/` private keys beyond listed license/config files

## Next planned (after you confirm this backup)

Target A — Settings **UI theme only** restore to 2026-07-23 unified look.  
If Target A fails → restore **this** backup, not Firmware Gold / classic-PASS, unless you order otherwise.
