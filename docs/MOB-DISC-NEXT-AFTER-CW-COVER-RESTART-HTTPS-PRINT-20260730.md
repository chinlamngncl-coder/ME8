# MOB DISC — Next MOB after Command Wall cover PASS

**Date:** 2026-07-30  
**Status:** **APPLIED** via `RESTART-HEALTH-PRINT-HTTPS-4438-V1` (2026-07-30) — awaiting operator PASS  
**Just PASSed:** `COMMAND-WALL-FILL-COVER-V1`  
**Search:** next MOB, 4438, restart HEALTH PASS, RESTART-HEALTH-PRINT-HTTPS  
**Related:** `MOB-DISC-RESTART-HEALTH-PRINT-HTTPS-4438-V1-APPLIED.md` · `MOB-DISC-LAB-4438-VS-3988-RESTART-PRINT-CONFUSION-20260730.md`

---

## Why this next (one pick)

Operator anger this session was **not** “video broken” — it was **“I can’t open 4438 / restart only shows 3988.”**  
HTTPS was fine; the **restart window lied by omission**. Fix that message before more Analytics chrome.

| Candidate | Why not now |
|-----------|-------------|
| Engine health on Face panel | Nice; secondary |
| ANPR offline hit parity | No hit path yet — stay recorded |
| WVP audio / PTT phase 6+ | Bigger; not this session’s wound |

---

## Next MOB

### `RESTART-HEALTH-PRINT-HTTPS-4438-V1`

| # | Change |
|---|--------|
| 1 | After HEALTH PASS, print **primary:** `https://<LAN>:<FM_HTTPS_PORT>` when `FM_HTTPS_ENABLED=1` (lab default **4438**) |
| 2 | Print **HTTP fallback:** `http://<LAN>:<FM_HTTP_PORT>` (3988) |
| 3 | Touch: `restart-fleet-prefer-service.ps1` + `RESTART-FLEET.bat` echo lines (same wording) |
| 4 | Do **not** change TLS, ports, certs, or service bind |

**PASS:** Restart window shows **https://192.168.1.38:4438** first (or current LAN), then HTTP fallback.  
**FAIL:** Still HTTP-only, or wrong port when HTTPS off.

---

## Operator decide

When ready:

- **`MOB-APPLY RESTART-HEALTH-PRINT-HTTPS-4438-V1`**

**No code in this disc.**

---

## Lock record

| Item | Decision |
|------|----------|
| CW cover | **PASS** |
| Next APPLY | **`RESTART-HEALTH-PRINT-HTTPS-4438-V1` APPLIED** — see APPLIED disc |
| Code | Done — operator PASS pending |
