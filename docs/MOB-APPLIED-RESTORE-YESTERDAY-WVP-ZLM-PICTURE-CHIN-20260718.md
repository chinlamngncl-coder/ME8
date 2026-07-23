# MOB APPLIED — restore-yesterday-wvp-zlm-picture-chin

**Date:** 2026-07-18  
**APPLY:** `MOB-APPLY restore-yesterday-wvp-zlm-picture-chin`  
**Disc:** `MOB-DISC-BRING-BACK-YESTERDAY-WVP-NO-GOOGLE-20260718.md`

---

## Code / env

| | |
|--|--|
| Chin thin allowlist | Skip Fleet INVITE · WVP `startPlay` (no pool required) |
| Soft Open UI | **Not** touched (frozen) |
| `FM_LAB_WVP` | `1` |
| `FM_WVP_THIN_CAMS` | `…0008` |
| `FM_WVP_FLEET_PRESENCE` | `1` (dots while Chin on WVP) |
| Soft Open-only | `0` (Chin via thin list only; kk stays Fleet) |

---

## YOU MUST DO (order)

### 1) Chin BWC — same as yesterday WVP picture

| Field | Set |
|-------|-----|
| IP | `192.168.1.38` |
| Port | **`5060`** |
| Domain | `4401020049` |
| Platform ID | `44010200492000000001` |
| Password | `admin123` |

Save → reboot Chin → wait until it comes up.

### 2) PC

`RESTART-FLEET.bat` → wait ~15s

### 3) Ops

`http://localhost:3988` → open **Chin only**

### 4) Report

- **`yesterday-picture-ok`** — picture + log will show `wvp-zlm primary` · `restoreYesterday`  
- **`still-black`** / **`still-ffmpeg`** — say which  

---

## Rollback if live dies

```text
MOB-APPLY undo-thin-wvp-back-to-classic-live
```

Or classic flags: `FM_LAB_WVP=0`, clear thin list, presence `0`, Chin back to Fleet `:5062`.

**One line:** Restore Chin WVP picture path; you rekey Chin to `:5060`/WVP platform → restart → test Chin live.
