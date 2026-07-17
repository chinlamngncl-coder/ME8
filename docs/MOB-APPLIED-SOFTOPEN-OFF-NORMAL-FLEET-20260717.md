# MOB APPLIED — softopen-off-normal-fleet

**Date:** 2026-07-17  
**APPLY:** `MOB-APPLY softopen-off-normal-fleet`  
**Cheat sheet:** step 4

## What (env only — no Soft Open UI code)

In local `.env` (not committed — secrets stay local):

| Flag | Value | Effect |
|------|-------|--------|
| `FM_LAB_WVP` | `0` | Soft Open / WVP lab path off; broker won’t prefer `wvp-zlm` |
| `FM_SOFTOPEN_WVP_ONLY` | `0` | No “skip Fleet INVITE for Soft Open” |
| `FM_WVP_FLEET_PRESENCE` | `0` | Fleet online from normal Fleet/YDT, not WVP lab |

WVP base URL/creds left in `.env` for later clean MVP (not used while lab off).

**Not touched:** `video-wall.js`, player, broker dirty Soft Open storm files (still local until step 5).

## You must (operator)

1. **Restart** Fleet (service or `RESTART-FLEET.bat`) so `.env` loads.  
2. Hard refresh dashboard once.  
3. **TEST** (say PASS or FAIL):  
   - Normal live / wall / pin  
   - SOS  
   - PTT / call  
   - Redact still opens  

## NEXT (only after you say PASS)

```text
MOB-APPLY git-restore-softopen-storm-files-only
```

If FAIL → tell what broke; do **not** paste step 5 yet.
