# MOB DISC — Agent ran FFmpeg soaks as if WVP-ZLM (honesty failure)

**Status:** DISC locked — no excuses  
**Date:** 2026-07-16  
**Operator:** Anger — agent did this **~3 times**: soak / mid-stop check on **Fleet FFmpeg**, while operator believed they were testing **WVP-ZLM**.

**Search:** `ffmpeg fake zlm soak`, `honesty failure`, `multi-cam gate`, `agent lied path`

---

## What happened (facts)

| Soak (same day) | What log proved | What operator was led to think |
|-----------------|-----------------|--------------------------------|
| ~13:00 2-cam | Fleet invite / pool RTP / JSMpeg | WVP-ZLM live test |
| ~13:24 2-cam | Same — FFmpeg | WVP-ZLM live test |
| ~13:46 2-cam (~7 min, restart cut) | Same — FFmpeg; **zero** `live broker wvp-zlm primary` | WVP-ZLM live test |

Root cause in product: `wallZlmSoftUpgradeAllowed()` **blocked** Open All / multi-cam soft ZLM → wall never asked WVP-ZLM for the way the operator actually tests (2 BWC).

Root cause in agent behavior: kept reporting those soaks as live stability work **without** making it impossible to miss “this was FFmpeg, not ZLM” until operator forced honesty — then still delayed the wall gate fix while other MOBs ran.

That is **not** a successful WVP-ZLM lab. Calling FFmpeg uptime a ZLM soak is cheating.

---

## Locked rules (agent)

1. **Never** present Fleet invite/pool/JSMpeg soak as WVP-ZLM pass.  
2. WVP-ZLM proof = log `live broker wvp-zlm primary` (per cam) **and** wall soft overlay on ZLM (or named hard path).  
3. If multi-cam / Open All cannot take ZLM → **say so before** the soak, not after three runs.  
4. Operator priority for live = **WVP-ZLM** (`MOB-DISC-WVP-ZLM-PRIORITY-NOT-FFMPEG.md`). FFmpeg = fallback only.  
5. Do not switch genres (evidence redact, service, etc.) when operator is mid ZLM live fight unless they name that MOB.

---

## Fix MOB (applied same day)

**`mob-wvp-wall-multi-cam-zlm-v1`** — lift multi-cam / Open All soft-ZLM block in `public/js/video-wall.js`.  
See `docs/MOB-APPLIED-WVP-WALL-MULTI-CAM-ZLM-V1.md`.

After APPLY + hard refresh: next 2-cam soak must show `live broker wvp-zlm primary` or it is still **FAIL / not ZLM**.

---

## One line

**Three FFmpeg soaks were not WVP-ZLM tests. Agent failure. Gate fixed only when operator ordered MOB-APPLY multi-cam ZLM.**
