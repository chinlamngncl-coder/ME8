# MOB DISC — Cropping still not best · deskew gate status · ARU Move lesson

**Date:** 2026-08-03  
**Status:** DISC LOCKED — APPLY done as `ANPR-BEST-PLATE-CROP-TRACK-V1` (`MOB-APPLIED-ANPR-BEST-PLATE-CROP-TRACK-V1-20260803.md`)  
**Video:** [ARU Move – Mobile LPR Solution](https://www.youtube.com/watch?v=En1_ZIemioY&t=71s) (ASURA Technologies Ltd.)  
**Related:** deskew gate APPLIED in `plate_pose_ccpd.py`; OCR `cct-s` + char-vote APPLIED separately

---

## Your questions (straight)

### 1) Did we already do the deskew gate?

**Yes — applied.** In `anpr-sidecar/plate_pose_ccpd.py`:

- Before `cv2.warpPerspective`, measure TL–TR (and trap / aspect).  
- If top width &lt; 30 px or extreme side-angle → **skip warp** → **xyxy bbox crop** around keypoints (`ccpd-yolov8-pose-bbox-fallback`).  
- Meta: `deskewGate`, `warpBypassed: true`.

That stops barcode-smear warps. It does **not** by itself make every micro-crop “ARU demo tight.” Deskew gate = safety. Best crop = still a separate quality + speed problem.

### 2) Can we match what that company shows?

**Yes in product shape — not by copying their closed engine.**

The video is **ARU Move** (Asura Technologies): **mobile LPR** — camera on a moving enforcement vehicle, reading plates of **parked and moving** cars. Commercial stack (OEM analytics + UI). They do **not** publish MIT/Apache crop math for us to paste.

What the demo *implies* (same as every serious mobile ALPR, including DHS ALPR survey language):

1. **Continuous video**, not one lucky snapshot  
2. **Vehicle track** across frames (same car = one case)  
3. **Plate localize inside vehicle** (tight plate ROI)  
4. **Pick the best plate crop over the track** (sharpness / size / angle) — then OCR once (or vote)  
5. **Evidence card** = vehicle context + plate crop + plate string + time (same UI idea as our rail)

So: same problem class as BWC live (moving camera and/or moving target). We are allowed to reach that quality with **open** tools we already use (YOLO vehicle → CCPD pose / FastALPR plate → best-frame crop → OCR). We will **not** reverse-engineer Asura binaries.

---

## Why our crops still feel “not at best”

| Layer | Status | Gap vs ARU-style mobile LPR |
|-------|--------|------------------------------|
| Deskew gate | **Done** | Prevents warp disaster only |
| Vehicle macro | Working | Sometimes too wide / includes clutter |
| Plate localize (CCPD pose) | Working | Edge / far / moto still loose or jittery |
| Pad 10–15% | Fixed policy | Can still clip badge or include bumper text |
| Best crop over track | **Weak** | We often OCR **every** flush; ARU-style keeps **sharpest plate crop** for the track then reads |
| Speed | Slow | Pose + enhance + OCR every tick ≠ “best crop first, OCR second” |
| OCR | `cct-s` just applied | Separate from crop tightness |

Human-readable NAI 2170 micros already proved crop can be good. Remaining crop fails: **loose box, wrong frame in track, side-angle bbox still messy, moto/far plates, slow path.**

---

## What ARU Move teaches us (actionable, not magic)

Plain English takeaways from that product class:

1. **Mobile-first** — pipeline tuned for camera motion + target motion (BWC is the same class).  
2. **Track → best evidence** — one vehicle ID, accumulate plate crops, publish the **best** micro (and one string), not four competing crops.  
3. **Tight plate ROI** — plate detector / 4-pt on the **vehicle ROI**, not soft full-frame hope.  
4. **OCR is not the crop** — they still need a clean plate patch; marketing shows tight patches for a reason.

We already have pieces (vehicle detect, track macros, CCPD pose, deskew gate, temporal vote). The missing crop product behavior is mainly: **best-plate-crop selection + tighter localize + faster live crop path**.

---

## Recommended next MOB (one path)

### `ANPR-BEST-PLATE-CROP-TRACK-V1`

**Goal:** ARU-Move-like evidence quality on open stack — moving or stationary cars, BWC moving.

1. **Per track: keep top-K plate micros** ranked by: Laplacian sharpness × plate pixel area × (bonus if deskewGate.ok / not warpBypassed).  
2. **OCR only the current best** (or char-vote across top-K best), not every mediocre flush.  
3. **Tighter crop:** after CCPD keypoints, use **min-area rect / ordered quad bbox** with pad **8–12%** (not oversized vehicle scrap); if deskew fails, xyxy from keypoints only (already), then optional 1.05× scale — no second warp.  
4. **Speed:** skip `enhance_plate_crop` when sharpness already above mid floor; live path stays FastALPR-only.  
5. **PASS:** same NAI SUV — micro looks **tight on plate characters** (little bumper), rail **one** strong card, not four loose/wrong crops.

**Not in this MOB:** buying Asura; HyperLPR as crop; PP-OCR return.

---

## Honest limit

We will not get Asura’s closed model weights from YouTube. We **can** match the **behavior** operators care about: tight plate patch, stable track, best-frame evidence, readable OCR — with MIT/Apache pieces we already ship.

---

## Operator ask

When ready:

`MOB-APPLY ANPR-BEST-PLATE-CROP-TRACK-V1`

Deskew gate stays. This MOB improves **which crop we keep** and **how tight** it is, and makes live crop path faster.
