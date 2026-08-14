# MOB DISC — ANPR: Stage-2 swap vs old strategy + Engine Not available — 2026-08-11

**Status:** PAPER. No code this turn.  
**Read:** `.cursorrules`  
**Your shot:** ANPR Live kk video OK · **ANPR Engine — Not available** · Recent = AWAITING CAPTURE · server up/down.

---

## Short answers

### Did we keep the old strategy?

| Layer | Kept? |
|-------|--------|
| Stage 1 vehicle YOLO → vehicle crop | **YES** |
| IoU track + best macros + consensus (`anprTrackBestFrame`) | **YES** |
| Live OCR = FastALPR-only (blur gate) | **YES** |
| Heavy OCR = FastALPR + HyperLPR | **YES** |
| Stage 2 plate localize (inside vehicle) | **NO — replaced** |

**Before (old):** CCPD pose (then WPOD / FastALPR-det hatch) → plate micro → OCR.  
**After Stage-2 APPLY:** default **`ph_id_plates_best.pt` (Ultralytics)** only. CCPD/WPOD only if `FM_ANPR_PLATE_DET=legacy_ccpd` (or wpod).  

So: **crop-in-crop shape stayed**; **Stage-2 detector did not** — new train became the default champion. That was the APPLY you ordered. It is **not** “add train beside old”; it **swapped** Stage 2.

### Why “Not available” + nothing captured + up/down?

UI badge = Node cannot get healthy ANPR sidecar (`/health` / runtime not ready). Live video is Fleet/WVP — **independent** of plate engine. So you can see kk live and still get **zero captures**.

Likely after Stage-2 wire:

1. Sidecar **crash / restart loop** loading Ultralytics + `ph_id_plates_best.pt` (lab already saw NumPy/onnxruntime stress when probing YOLO).  
2. Or Stage 2 loads but health/`ready` fails → poller never emits.  
3. Port **8768** flap (second process / crash restart) matches “server keep coming up and down.”

**Not** “video broken.” **Engine path broken or unstable.**

---

## Verdict

Old **full** strategy was **not** fully kept — Stage 2 was swapped. That is the prime suspect for Engine Not available + no captures.

---

## Recommended next (one MOB)

**Name:** `ANPR-STAGE2-SAFE-FALLBACK-V1`

| Do |
|----|
| Default Stage 2 back to **CCPD** (old champion) so live captures work again |
| If `ph_id_plates_best.pt` loads OK → use it; on miss/crash → **CCPD**, never kill sidecar |
| Never import Ultralytics on health-only path in a way that takes the process down |
| Keep Stage 1 + FastALPR OCR + IoU track |

**Operator now (no APPLY):** stop extra ANPR processes; one sidecar on **8768**; if still Not available → say so and APPLY fallback.

```text
MOB-APPLY ANPR-STAGE2-SAFE-FALLBACK-V1
```
