# MOB DISC — ANPR Live: zero crops vs FR (why + high-speed auto crop)

**Date:** 2026-07-31  
**Status:** DISC — **no code until** APPLY  
**Operator:** Live vehicle in view → **zero cropping**. Need **high-speed** auto crop like FR — cars **front + rear**, especially **Chinese** plates.  
**Page (8-rail):** layout PASS path separate — this is **engine / poller**, not rail CSS.

---

## Verdict (why zero crops)

Live ANPR is **not** doing FR-style “detect → always push tight crop to rail.”

| Step | What code does today | Effect |
|------|----------------------|--------|
| 1 Grab | `frLiveProbe.grabJpegForFr` full frame (~every `FM_ANPR_POLL_SEC`, default **3s**) | OK if cam is “live” for poller |
| 2 Save | Writes **whole JPEG** as `anpr_*.jpg` | Rail “crop” is often a **full street still**, not a plate box |
| 3 OCR | Sidecar `readPath` (FastALPR / YOLO plate + OCR + region regex) | Can find a box **inside** sidecar — **never returned** to Node as image |
| 4 Emit | **`if (!plate) return`** — no `anpr-crop-tick` unless text passes | **No plate text → rail stays empty** = your “zero cropping” |
| 5 Region | Default `FM_ANPR_REGION=ph` — finders: ph / kr / th / en — **no `cn`** | Chinese plate OCR may work briefly then **regex reject** → same as no plate → **no tick** |

So three stacked fails:

1. **UI gate** — crop only after successful plate string (FR pushes face crops even without watchlist hit).  
2. **Wrong artifact** — even on success, URL is often **full frame**, not detector ROI.  
3. **CN pack missing** — Chinese plates systematically fail the publish gate.

Also: poller only runs for cams in `anpr-watch-slots` **and** `isCamLive` (WVP active / pool). If Start watch did not prove Live / slots empty, grab never runs — also zero. Check after attach PASS that meta shows live tiles when testing crop.

---

## How FR does it (target behavior)

```text
Grab frame → face detect → tight face JPEG → always fr-crop-tick → rail
                         → match later → hit / map (separate)
```

ANPR should mirror:

```text
Grab frame → plate detect (front/rear of vehicle) → tight plate JPEG → always anpr-crop-tick → 8-rail
                         → OCR + region pack → plate text on card
                         → list match → hit / toast / (map later)
```

Detector must fire on **rear and front** plates (car / motorcycle / van). Ship already has FastALPR plate YOLO-class detector — use it for **crop-first**, not OCR-first.

Optional later: vehicle class (car front/rear) to bias search band — **not** required for first APPLY if plate YOLO already sees both ends.

---

## Chinese plates (locked need)

| Today | Need |
|-------|------|
| Region packs PH-centric | Add **`cn`** (and keep PH for lab) — format regex for common CN patterns (province + alnum; new energy if needed) |
| Global FastALPR OCR | Often OK on CN glyphs/latin mix; **regex floor** must not kill CN |
| Operator lab | Many test plates / BWCs show CN-style numbers |

Region switch: env / Settings later; Live must not hard-require PH-only to publish a crop.

---

## What “high-speed cropping” means (product)

| Goal | Spec |
|------|------|
| Cadence | Detect path **faster** than full OCR every 3–8s — e.g. poll **~1s**, detect-only first; OCR every Nth frame or when box changes |
| Always rail | **Every** confident plate **box** → tight crop on 8-rail (even if OCR fails / low conf) |
| No full-frame lie | `cropUrl` = **ROI JPEG** from detector, not whole BWC frame |
| Front + rear | Plate detector on full frame (FastALPR / plate YOLO) — both ends of vehicle |
| Confidence on Live | Still **not** shown on 8-rail cards (layout lock) — OCR conf only internal / Snapshot if needed |

---

## Recommended MOB order (one at a time)

### 1) `ANPR-LIVE-CROP-FIRST-RAIL-V1` ← **do first**

**Why first:** Fixes “zero cropping” and “not really a crop” without inventing a new ML stack.

1. Sidecar returns best plate **ROI crop bytes** (or box) on every detect, even when `ok: false` / no regex plate.  
2. Poller saves **that** JPEG as `cropUrl`; emit `anpr-crop-tick` when a **box exists** (OCR optional fields).  
3. Stop emitting full-frame as the rail image.  
4. Keep list-hit path when plate text + list match.  
5. Do not touch 8-rail CSS (already APPLIED).

**PASS:** Point BWC at a vehicle plate (PH or CN in frame) → within a few seconds **tight plate crops** fill the 8-rail, even if text is wrong/empty.  
**FAIL:** Still empty rail, or rail still shows full street scene.

### 2) `ANPR-REGION-CN-PACK-V1`

CN regex + region select (and don’t block crop-first). OCR text on rail for Chinese formats.

### 3) `ANPR-LIVE-DETECT-SPEED-V1`

Faster poll / detect-only API / skip heavy OCR when box stable — “high speed” feel like FR rolling snaps.

### 4) (Optional) `ANPR-VEHICLE-FRONT-REAR-BAND-V1`

Vehicle detect → search plate in front/rear bumper bands — only if plate-only still misses distant cars after (1)+(3).

### Later (already parked)

`ANPR-LIVE-HIT-MAP-FR-PARITY-V1` — map on list hit after page + crop PASS.

---

## What we will **not** do in the first MOB

- Rewrite Live UI again  
- Turn off WVP / invent a third video pipe  
- Claim “Chinese YOLO car model” without a named weights path and APPLY  
- Bundle CN + speed + vehicle cascade into one APPLY  

---

## APPLY (when you want code)

```
MOB-APPLY ANPR-LIVE-CROP-FIRST-RAIL-V1
```

No code in this disc.
