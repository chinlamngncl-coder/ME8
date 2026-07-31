# MOB DISC — RESTART-HEALTH-PRINT-HTTPS-4438-V1 APPLIED

**Date:** 2026-07-30  
**Status:** **APPLIED** — awaiting operator PASS  
**APPLY:** `MOB-APPLY RESTART-HEALTH-PRINT-HTTPS-4438-V1`  
**Parent:** `MOB-DISC-LAB-4438-VS-3988-RESTART-PRINT-CONFUSION-20260730.md` · `MOB-DISC-NEXT-AFTER-CW-COVER-RESTART-HTTPS-PRINT-20260730.md`

---

## What changed

When `FM_HTTPS_ENABLED=1`, restart HEALTH PASS prints:

```text
Open dashboard (primary HTTPS): https://192.168.1.38:4438
HTTP fallback:                 http://192.168.1.38:3988
Localhost HTTP:                http://localhost:3988
```

(LAN IP from preferred helper / `.env` `FM_HTTPS_LAN_IP` / lab fallback — never 172.x)

## Files

- `restart-fleet-prefer-service.ps1` — `Write-DashboardOpenUrls` + `-PrintUrlsOnly`
- `RESTART-FLEET.bat` — success + console start use same print (no hard-coded HTTP-only line)

No TLS / port / cert changes.

## Operator verify

1. Run `RESTART-FLEET.bat` (or `-PrintUrlsOnly` smoke).
2. After HEALTH PASS: **HTTPS :4438 first**, then HTTP :3988.
3. Open the HTTPS URL (cert continue if needed).

## Lock

Restart messaging advertises lab primary HTTPS when enabled — not HTTP-only.
