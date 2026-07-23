# MOB DISC — Can’t open live · BWC online · merry-go-round again

**Date:** 2026-07-18 ~12:07  
**Status:** DISC — cause proven · **undo needs your APPLY**  
**Ask:** Can’t open live; BWC online. How did we solve this. Don’t waste credits.

---

## Cause (this morning’s thin MOB — not mystery)

Log **12:05**:

| Line | Meaning |
|------|---------|
| `invite skipped` · `thinPicture:true` · Chin | Thin MOB **blocks Fleet INVITE** |
| `wvp_startplay_failure` | WVP picture **also fails** |
| Result | **No live path** — online yes, picture no |

Same class of bug as Jul-17 (`MOB-DISC-CHIN-5062-SOS-OK-LIVE-DEAD-NO-PATCH`):  
**`FM_LAB_WVP=1` + cam not on working WVP play → black / no live.**  
Last night classic PASS fixed it with **`FM_LAB_WVP=0`** (Fleet invite back).

---

## How we solve it (same as last night)

**Turn thin WVP off. Classic Fleet live back.**  
No Soft Open UI. No platform lecture. No new invent.

### Paste this when you want the fix

```text
MOB-APPLY undo-thin-wvp-back-to-classic-live
```

That APPLY will:

1. `.env`: `FM_LAB_WVP=0` · clear/empty `FM_WVP_THIN_CAMS` · Soft Open-only stay `0` · presence stay `0`  
2. Restart needed once  
3. You: `localhost:3988` → open Chin live → expect Fleet/FFmpeg again  

Optional nuclear: `RUN RESTORE-ME8-CLASSIC-PASS-20260718` (bigger; only if you want full floor).

---

## Do not do now

- Rekey cams again  
- Soft Open patches  
- More “try WVP” while live is dead  

---

**One line:** Thin MOB skips Fleet INVITE + WVP startPlay fails = can’t open live; undo = `MOB-APPLY undo-thin-wvp-back-to-classic-live` (same cure as last night: lab WVP off).
