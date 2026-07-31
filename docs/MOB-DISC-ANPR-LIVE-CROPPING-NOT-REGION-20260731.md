# MOB DISC — ANPR Live zero crops: **cropping**, not region (correction)

**Date:** 2026-07-31  
**Status:** DISC — **no code until** APPLY  
**Operator correction:** It is **not** about region. Cropping is cropping. PH plates already work for matching when a read succeeds. Do **not** hardcode PH or CN. Agent wrongly dragged “Chinese” into a region pack — that was **off-point** and looks like cheating past the real fail.

**Supersedes (for next APPLY intent):** region / CN sections of `MOB-DISC-ANPR-LIVE-ZERO-CROP-VS-FR-20260731.md`. That disc’s **crop-first diagnosis** stays; its **CN / region “fix” ranking is revoked**.

---

## What the operator said (locked)

| Said | Means |
|------|--------|
| Zero cropping on Live with a vehicle in view | Rail never gets **tight plate stills** like FR face crops |
| PH already works for matching | OCR + list match path is **not** the primary complaint |
| Cropping is technology | Detector → box → JPEG crop — **region-agnostic** |
| Don’t hardcode PH or CN | No “fix Live by shipping a CN regex pack” MOB as the answer |

Agent invented a region story. **Wrong.** Wake up: concern = **crop pipeline**, not passport of the plate.

---

## Real fail (cropping only)

```text
TODAY (Live):
  grab full frame → OCR whole path → if no plate string → emit NOTHING
  if plate string → save FULL FRAME as "cropUrl"  ← not a crop

FR (target pattern):
  grab → DETECT box → ALWAYS save TIGHT crop → rail
  match / OCR text is separate
```

| Bug | Why rail is empty / useless |
|-----|-----------------------------|
| **OCR-gated emit** | `anprLivePoller`: no plate text → no `anpr-crop-tick` |
| **Full-frame artifact** | Saved JPEG is the grab, not the detector ROI |
| **Sidecar ROI not returned** | Box may exist inside FastALPR/YOLO; Node never gets crop bytes for the rail |

Region regex (PH or anything else) is **downstream of cropping**. Matching already proven on PH when a read lands. Live fail is **upstream**: no automatic tight crops published.

---

## What we will **not** do

- Hardcode Live to PH-only or CN-only  
- Lead with `ANPR-REGION-CN-PACK` or any “region pack” as the crop fix  
- Pretend Snapshot manual crop = Live auto crop  
- Bundle map / UI / OCR engine rewrite into the crop MOB  

Region packs remain a **separate** genre if/when operator ever asks for a new plate **format** — not now, not as a cheat past cropping.

---

## Locked product answer

**Cropping technology first** (same idea as FR rolling face crops):

1. Detect plate rectangle on the live grab (front or rear of vehicle — detector geometry, not “nationality”).  
2. Write **tight** plate JPEG.  
3. **Always** push to 8-rail when a box is confident enough.  
4. OCR + list match run on that crop (existing PH matching stays); empty/wrong text still leaves the **picture** on the rail.

No region switch required for that MOB.

---

## One MOB (when you APPLY)

### `ANPR-LIVE-CROP-FIRST-RAIL-V1`

1. Detect → ROI crop bytes back to Node (or crop in Node from returned box).  
2. Emit `anpr-crop-tick` on **box**, not only on plate string.  
3. `cropUrl` = tight ROI only — never full BWC frame as the rail image.  
4. Keep existing read/match when text is available.  
5. No region hardcoding. No CN pack. No map.

**PASS:** Vehicle with plate in Live view → 8-rail fills with **tight plate crops** (PH lab plates fine).  
**FAIL:** Empty rail, or full-scene stills labeled as crops, or a “region” rewrite instead of crop.

---

## APPLY

```
MOB-APPLY ANPR-LIVE-CROP-FIRST-RAIL-V1
```

No code in this disc.
