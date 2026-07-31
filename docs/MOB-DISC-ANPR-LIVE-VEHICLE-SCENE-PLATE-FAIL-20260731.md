# MOB DISC — ANPR Live FAIL: empty rail + plate-only (no vehicle) is wrong product

**Date:** 2026-07-31  
**Status:** DISC — **FAIL locked** · **no code until** named `MOB-APPLY`  
**Operator FAIL:**  
1. Power-crop MIT still **empty / sparse** — cams in front of plates on **motor, lorry, bus, car** → almost nothing.  
2. When something does crop, rail shows **plate scrap only** — **no vehicle / no full car view**. “Which ANPR does that dumb thing?”

**Supersedes as next path:** `MOB-DISC-ANPR-LIVE-POWER-CROP-MIT-20260731.md` Option A (512-only) → **FAILED field**.  
**Related APPLIED (keep facts, do not revert blindly):** crop-first publish path, 8-rail UI, FLV attach parity.  
**Not this disc:** Region regex / PH-CN text packs. Map-on-hit (parked).

---

## Verdict (plain English)

| Claim | Truth |
|-------|--------|
| “Bigger plate YOLO + 1s poll will fix Live” | **FAIL in field** — still empty/sparse with plates in face of BWC |
| “Tight plate crop only on the 8-rail is good ANPR” | **FAIL as product** — ops need to **see the vehicle** (car / bike / bus / lorry), then plate + list |
| Root design mistake | We **optimized for plate rectangle only** and **banned** scene context (`anprLivePoller`: never publish full frame as `cropUrl`). That stopped full-street junk **and** also killed the useful **vehicle picture** |

**Agent recommendation (one path):** Stop tuning plate-only FastALPR as the Live product. Next APPLY = **vehicle scene + plate** stack (Option C from power-crop disc), not another conf / 512 tweak.

---

## What the code does today (why it feels stupid)

```text
FLV still grab (frLiveProbe)
  → sidecar plate detect (MIT yolo-v9-t-512, fallback 384)
  → if plate box → cropJpegB64 = TIGHT PLATE ONLY
  → if no plate box → nothing on rail (empty)
  → UI 8-rail: one img = plate scrap · plate text · list · time · BWC
```

| File | Behavior |
|------|----------|
| `lib/anprLivePoller.js` | Explicit: only `cropJpegB64` → rail; **no** `vehicleUrl` / scene jpeg |
| `anpr-sidecar/fastalpr_engine.py` | Plate detector only — **no** car/moto/bus/truck class |
| `public/js/anpr-live-watch.js` | Rail card = single `cropUrl` image (plate) |

So even a **perfect** plate hit never shows the lorry/bus/car body. That is not a UI polish miss — it is the **pipeline contract**.

Empty/sparse with plates “right in front”: plate-tiny detector on **compressed FLV stills**, angle/motion, hard gates, or grab failures → **zero box → zero rail**. No vehicle fallback means **silence**.

---

## What real ANPR / ops expect (product lock)

| Surface | Must show | Optional |
|---------|-----------|----------|
| Live 8-rail card | **Vehicle scene crop** (car / moto / bus / truck in frame) as primary thumb | Plate text, list, time, BWC |
| Same card or lightbox | **Tight plate crop** (or plate strip under scene) | OCR confidence |
| Match / hit bar | Plate + list + Ack | Map later (parked MOB) |

**Forbidden as “done”:** rail of plate scraps with no vehicle context when a vehicle was in the BWC view.

**Not required:** Entire uncropped street (sky + road + five cars). Prefer **vehicle-bounded** scene (padded box around detected vehicle), not 1920×1080 full dump.

---

## Why POWER-CROP-MIT failed (do not re-APPLY A)

| Lever tried | Result |
|-------------|--------|
| MIT plate det **512** + conf 0.18 | Still miss / sparse in field |
| Fallback **384** | Does not fix “no vehicle in UI” |
| Poll **1s** / crop dedupe **900ms** | Denser empty ≠ better product |
| Crop-first without OCR text | Only helps when **plate box exists** |

**Do not:** lower conf to noise, region hardcoding, AGPL Ultralytics, or another “powerful plate-only” MOB without vehicle stage.

---

## Target pipeline (next APPLY — one MOB)

**Name (proposed):** `ANPR-LIVE-VEHICLE-SCENE-PLATE-V1`

```text
Live FLV grab
  → 1) Vehicle detect (car, motorcycle, bus, truck) — MIT/Apache ONNX, onnxruntime only
  → 2) For each vehicle ROI (+ optional full-frame plate pass):
        plate detect → tight plate crop + OCR/list (existing)
  → 3) Emit tick:
        vehicleUrl  = padded vehicle JPEG   ← NEW primary rail image
        cropUrl     = tight plate JPEG      ← keep for OCR / lightbox plate
        plate / list / cam / time           ← unchanged fields
  → 4) UI: rail shows vehicleUrl; plate text + small plate thumb or lightbox dual
```

| Need | Spec |
|------|------|
| Motor / car / lorry / bus | Vehicle classes in detector (COCO-style or equivalent MIT weights) |
| Empty rail fix | If vehicle found but plate miss → **still** push vehicle scene to rail (`plate: null` / “Plate…”) |
| Plate miss only | Prefer vehicle-first so rail is never “silent” when a vehicle fills the lens |
| License | onnxruntime + MIT/Apache weights only — same lock as power-crop disc |
| Grab | Keep FLV grab; log `anpr live grab skip` if stills fail (ops can check logs) |

**UI change (same MOB, not a second genre):**  
`anpr-live-watch.js` rail card: primary `vehicleUrl` (fallback `cropUrl` if no vehicle). Lightbox: vehicle large + plate strip.

---

## Candidate vehicle weights (lab bake-off before/during APPLY)

| Option | Notes |
|--------|--------|
| **YOLOv8/v9 COCO nano ONNX** (Apache/MIT export, runtime onnxruntime) | car / motorcycle / bus / truck classes — standard |
| Existing open-image / FastALPR ecosystem if they expose vehicle models | Prefer one vendor stack if quality OK |
| CCPD plate remains secondary on vehicle ROI | Plate power after vehicle ROI shrinks search |

Agent picks **one** ONNX after short lab stills test — no AGPL train stack in ship.

---

## Explicit non-goals

- Turning off WVP handoff / rebuilding Fleet video  
- CN/PH plate regex as the Live fix  
- Showing raw full BWC frame as every rail card (street spam)  
- Map pin on ANPR hit (still parked: `ANPR-LIVE-HIT-MAP-FR-PARITY-V1`)  
- Bundling “fix OCR language” into this MOB  

---

## PASS / FAIL (next APPLY)

**PASS:**  
1. Point BWC at motor / car / bus / lorry with plate visible → 8-rail fills with **vehicle pictures** (you can tell make/type/scene).  
2. Plate crop + text/list still available on card or lightbox.  
3. Dense enough while watch is running — not minutes of empty.

**FAIL:**  
- Still empty with vehicle filling the lens.  
- Rail still plate-scrap only with no vehicle.  
- Full uncropped street dump as every card.

---

## Operator action

No restart required for this disc.  

When ready:  
`MOB-APPLY ANPR-LIVE-VEHICLE-SCENE-PLATE-V1`

---

## Lock

**POWER-CROP-MIT = field FAIL.**  
**Plate-only Live rail = product FAIL** (operator locked).  
**Next:** vehicle scene + plate dual emit + UI — one named APPLY. No creativity outside that MOB.
