# MOB APPLIED — create-baseline-classic-pass-20260718

**Date:** 2026-07-18  
**APPLY:** `MOB-APPLY create-baseline-classic-pass-20260718`  
**Prior disc:** `MOB-DISC-BACKUP-CLASSIC-PASS-BEFORE-WVP-20260718.md`

## Result

| Item | Value |
|------|--------|
| Version | `me8-classic-pass-20260718` |
| Snapshot | `baseline/2026-07-18-classic-pass/` |
| Mirror | `ME8-BACKUPS/2026-07-18-classic-pass/` |
| Files locked | **2510** |
| Git at CREATE | `4952284` (`main`) |
| VERIFY | **OK** — 2510 / 2510 match |

## Wrappers (repo root)

- `CREATE-ME8-CLASSIC-PASS-20260718.ps1`  
- `RESTORE-ME8-CLASSIC-PASS-20260718.ps1`  
- `VERIFY-ME8-CLASSIC-PASS-20260718.ps1`  
- `BASELINE-ME8-CLASSIC-PASS-20260718.md`  

## Restore phrase (user only)

```
RUN RESTORE-ME8-CLASSIC-PASS-20260718
```

AI must **not** auto-restore.

## Env frozen in snapshot

`FM_LAB_WVP=0` · `FM_SOFTOPEN_WVP_ONLY=0` · `FM_WVP_FLEET_PRESENCE=0`

## Next

Clean WVP/ZLM return only when you name that APPLY. If WVP hurts ops → restore this floor (not Pre-Gate-C / not Gold unless you ask).

## Note on git

Snapshot includes `.env` and `storage/*` config for lab restore fidelity. Prefer **not** force-pushing secrets to public GitHub; keep baseline on disk + `ME8-BACKUPS`. Say if you want a **sanitized** git commit of wrappers + MANIFEST only.
