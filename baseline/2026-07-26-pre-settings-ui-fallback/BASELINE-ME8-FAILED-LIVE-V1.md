# ME8 FAILED LIVE v1 — frozen shelf (not the good live floor)

**Live app (untouched by this doc):** `C:\Users\user\Desktop\Enterprise Mobility\ME8`  
**Snapshot shelf:** `C:\Users\user\Desktop\Enterprise Mobility\ME8-BACKUPS\2026-07-09-failed-live-v1\`  
**Version:** `me8-failed-live-v1-20260709`  
**Locked:** 2026-07-09 — before Open All / Display Room place fixes  
**Files:** **4413** — VERIFY OK (4413/4413)  
**Index:** `ME8-BACKUPS\README.md`

This is a **100% fallback** of the **current** ME8 tree (rich post-gold work: MOB-DISC / compliance, SOS ledger, SMTP, TOTP, settings, Display Room, etc.) **including known live bugs**. It does **not** replace Firmware Gold as the good pin/live floor.

**Includes (lab):** `storage/secrets/` — **never ship** to customer packs.

---

## Create / Verify (user phrases)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\CREATE-ME8-FAILED-LIVE-V1.ps1
.\VERIFY-ME8-FAILED-LIVE-V1.ps1
```

Expect: `VERIFY OK` + `N/N`. If not → **reject** snapshot.

---

## Restore (AI only when you type the phrase)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\RESTORE-ME8-FAILED-LIVE-V1.ps1
.\RESTART-FLEET.bat
.\VERIFY-ME8-FAILED-LIVE-V1.ps1
```

**AI rule:** Restore only when user types **`RUN RESTORE-ME8-FAILED-LIVE-V1`**.

---

## Fallback ladder

| Layer | How |
|-------|-----|
| **ME8 Firmware Gold** | Good live — `RUN RESTORE-ME8-FIRMWARE-GOLD` |
| **FAILED LIVE v1** | This shelf — rich tree + known bugs |
| **me8-v1** | Older |

---

## Rules (no halfbaked backups)

1. MANIFEST + HASHES required  
2. VERIFY must be 100%  
3. CREATE fails on missing required files  
4. Secrets included = lab-only label mandatory  
