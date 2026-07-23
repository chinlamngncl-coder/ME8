# MOB-APPLIED — Restore classic-PASS only (life-and-death)

**Date:** 2026-07-20  
**Order:** Operator — classic PASS only, no other changes  
**Phrase intent:** classic-PASS restore (`RESTORE-ME8-CLASSIC-PASS-20260718.ps1`)

---

## Done

| Step | Result |
|------|--------|
| Restore from `baseline/2026-07-18-classic-pass/` | **2510** files restored |
| VERIFY | **OK** — 2510 / 2510 match |
| `.env` WVP live | `FM_LAB_WVP=0` · Soft Open off · presence off |
| Fleet restart | UbitronC2 restarted · `:3988` listening |

**No** freestyle edits after restore. **No** Phase-2 / VoiceAdapter / WVP flag flips.

---

## Operator

1. Hard refresh dashboard (`http://192.168.1.38:3988` or localhost)  
2. Confirm classic Ops feel (live / PTT / Call as at Jul 18 PASS)  
3. Cams on Fleet SIP **:5062** for classic picture  

If anything looks wrong → say so; do not freestyle.
