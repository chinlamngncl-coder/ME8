# MOB APPLIED — softopen-off-keep-wvp-presence

**Date:** 2026-07-17  
**APPLY:** `MOB-APPLY softopen-off-keep-wvp-presence`  
**Fixes:** Soft Open off made Axiom show offline (one-row BWC on :5060; presence was turned off).

## .env (local only — not committed)

| Flag | Value | Why |
|------|-------|-----|
| `FM_SOFTOPEN_WVP_ONLY` | `0` | Soft Open-only picture / skip Fleet INVITE stays **off** |
| `FM_LAB_WVP` | `1` | WVP lab API on (needed for presence poll) |
| `FM_WVP_FLEET_PRESENCE` | `1` | Axiom online follows WVP (cams REGISTER :5060, not Fleet :5062) |

No BWC IP/port change. Dashboard still `http://192.168.1.38:3988`.

## Operator

1. **Restart** Fleet (service / `RESTART-FLEET.bat`).  
2. Hard refresh.  
3. Wait ~8–15s — Chin/kk should show **online**.  
4. Then TEST: live / SOS / PTT / redact → **PASS** or **FAIL**.

## NEXT (only after PASS)

```text
MOB-APPLY git-restore-softopen-storm-files-only
```
