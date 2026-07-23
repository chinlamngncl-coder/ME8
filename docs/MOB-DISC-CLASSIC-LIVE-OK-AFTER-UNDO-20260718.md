# MOB DISC — classic-live-ok after thin undo

**Date:** 2026-07-18  
**Status:** LOCK — operator PASS  
**Report:** `classic-live-ok`

---

## Floor

| | |
|--|--|
| Live | Classic Fleet + FFmpeg |
| Thin WVP picture | **OFF** (`FM_LAB_WVP=0`) |
| Soft Open UI | Frozen |
| Rekey | Not required for this PASS |

---

## Next (only when you want)

```text
MOB-APPLY wvp-thin-picture-v2-failopen-fleet
```

Or say **`park wvp`** and stay classic.

Prior plan: `MOB-DISC-WHAT-NOW-CLASSIC-THEN-WVP-REAL-NEXT-20260718.md`

**One line:** Classic live PASS after undo; WVP waits for v2 APPLY or park.
