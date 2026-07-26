# ME8 Settings UI Target A PASS backup

**Version:** `me8-settings-ui-target-a-pass-20260726`  
**Snapshot:** `baseline/2026-07-26-settings-ui-target-a-pass/`  
**Also copied to:** `ME8-BACKUPS/2026-07-26-settings-ui-target-a-pass/`  
**Locked:** 2026-07-26  
**Predecessor:** `me8-pre-settings-ui-fallback-20260726`

## What this is

Checkpoint **after** Settings UI Target A PASS:

- Unified theme CSS restored (`settings-theme-unify.css`)
- SaaS Deployment / SSL east-west wrap
- Dark file inputs, Maintenance nav divider, BWC Retire/Restore theme
- Full functional tree (license, SaaS chrome, WVP/Fleet, etc.)

Use this as the floor before more SaaS UI work so CSS cannot be destroyed without a restore path.

## Restore (you type this)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\RESTORE-ME8-SETTINGS-UI-TARGET-A-PASS.ps1
.\RESTART-FLEET.bat
```

AI runs restore **only** when you type: **`RUN RESTORE-ME8-SETTINGS-UI-TARGET-A-PASS`**

## Verify

```powershell
.\VERIFY-ME8-SETTINGS-UI-TARGET-A-PASS.ps1
```

## Create

```powershell
.\CREATE-ME8-SETTINGS-UI-TARGET-A-PASS.ps1
```

## Not in snapshot

- `node_modules/`, Python `.venv/`, Seeta models
- Full evidence archives (config JSON + `mobility.db` + license only)
- Nested older `baseline/*` packs (avoid recursion)
