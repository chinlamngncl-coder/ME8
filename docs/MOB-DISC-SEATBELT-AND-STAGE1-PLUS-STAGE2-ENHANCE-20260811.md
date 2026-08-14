# MOB DISC — “Seatbelt” explained + Stage 1 keep + Stage 2 enhance — 2026-08-11

**Status:** PAPER. You did **not** APPLY the ANPR fallback yet — correct.  
**Read:** `.cursorrules`

---

## What “seatbelt” meant (plain)

Not a second train. Not Stage 1 only.

**Seatbelt** = if the new Stage-2 file (`ph_id_plates_best.pt`) **fails to load / crashes** the sidecar, temporarily use old CCPD so the desk still captures — until weights load clean. Then ph_id is champion again.

You never ran that MOB. So today default is still **ph_id only** (from the earlier integrate APPLY). If engine is down, that is why.

---

## Can we combine Stage 1 style + add Stage 2 enhance?

**Yes — and that is already the design.**

| Layer | What it is | Train? |
|-------|------------|--------|
| **Stage 1** | Vehicle detect → vehicle crop | Keep as-is (not replaced by plate train) |
| **Stage 2** | Plate box **inside** that crop | **Your train** (`ph_id`) = enhance |
| **OCR** | Read text on plate crop | FastALPR live — keep |

```text
Stage1 vehicle  →  Stage2 ph_id plate  →  OCR
     (keep)            (enhance)          (keep)
```

- Train = **better Stage 2**, not overlap Stage 1.  
- Do **not** run CCPD and ph_id both every frame forever (waste / fight).  
- CCPD only as **emergency load fallback** (seatbelt), optional APPLY later if sidecar still flaps.

---

## What you do next

1. **VC:** hard refresh — offline should disappear from Live lists (this APPLY).  
2. **ANPR:** if Engine still Not available → then type  
   `MOB-APPLY ANPR-STAGE2-SAFE-FALLBACK-V1`  
   (seatbelt only — Stage 1 stays; ph_id preferred when healthy).
