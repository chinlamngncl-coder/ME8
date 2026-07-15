# MOB DISC — FR crop/align + Google MediaPipe/OpenVINO vs Seeta (priority + wake reminder)

**Date:** 2026-07-15 ~01:10  
**Status:** DISCUSSION only — **no APPLY**  
**Operator:** Need cropping change too; Seeta **not yet tested** (sleep — test after wake). If gone **&gt;3 hours**, on message **“i am back”** → agent **remind** this. Google paste = knowledge share.

---

## Wake reminder (agent — do this)

When operator says **`i am back`** (or clear equivalent) and last FR/Seeta/crop talk was **≥ ~3 hours** earlier (or new calendar day after they said they went to sleep):

Remind in one short block — **no nag daily**, only on that return phrase:

1. **Seeta still unproven** — Restart Fleet if needed; Watchlist **Re-embed gallery**; run live / Score prove.  
2. **Crop/align still open** — raw box crop today; Google Stage 1.5 alignment not applied.  
3. Do **not** start MediaPipe/OpenVINO engine swap until Seeta pass/fail is known (unless they APPLY that by name).

---

## Critical function (FR lane)

| Keep | Don’t break while experimenting |
|------|----------------------------------|
| Live FR poll path that feeds snaps | Wall / Open All / pin / PTT |
| Watchlist 70% bar (locked unless named) | InsightFace **pack chasing** (parked) |
| Seeta as **current** live engine wire (`FM_FR_ENGINE=seeta`) | Silent rollback to DeepFace as “strategy” |

---

## Where we actually are (not Google’s script)

| Layer | Today | Google paste wants |
|-------|--------|-------------------|
| Live matcher | **Seeta** sidecar :8767 (wired; **you test after wake**) | Jump to **OpenVINO** ResNet |
| Detect/crop | Seeta **detector** + **bust box crop** (`cropMode: bust`); landmarker model **present** (`face_landmarker_pts5`) | **MediaPipe BlazeFace** + 6 landmarks |
| Align | **Missing / weak** — raw crop to embed | OpenCV **affine** from eyes |
| YuNet | Mostly **Evidence redact** track — not the live Seeta matcher | “Replace YuNet” as Stage 1 |
| DeepFace / ONNX | Backup / parked | “Replace DeepFace” |

Google’s **replace DeepFace+YuNet with MediaPipe+OpenVINO** is a **second architecture**. We already chose **Seeta** as the Chinese legal-free #1 bet. Do **not** thrash engines before Seeta desk PASS/FAIL.

What Google **did** get right for us: **alignment (Stage 1.5)** and “don’t send tilted BWC boxes to the matcher.”

---

## Score Google’s 3 stages (share, not gospel)

### Stage 1 — MediaPipe BlazeFace cropper

| | |
|--|--|
| **Agree idea** | Dedicated face detector + landmarks beats dumb full-frame |
| **Vs us** | Seeta **already detects**; has **5-pt landmarker** in tree |
| **Risk of full MediaPipe C++ now** | **High** — new SDK, Windows packaging, dual detect with Seeta, weeks |
| **Take** | Park MediaPipe until Seeta **fails** detect on BWC angles |

### Stage 1.5 — Affine align from eyes (OpenCV)

| | |
|--|--|
| **Agree** | **Highest ROI after Seeta prove** — BWC tilt kills match |
| **Vs us** | Crop is box-only today; landmarker unused for warp |
| **Legal** | OpenCV path fine |
| **Take** | **P1 FR MOB after Seeta wake test** — align with **Seeta landmarks** first (same engine) |

Named candidate: `mob-fr-seeta-align-crop`  
(Detect → landmarks → warp → then Seeta embed — not raw bust jpeg.)

### Stage 2 — OpenVINO matcher

| | |
|--|--|
| **Agree idea** | Apache CPU FR is a real ship story |
| **Vs us** | Conflicts with **Seeta-first** until Seeta FAIL |
| **Take** | **P3 alternate engine** — `mob-fr-openvino-poc` only if Seeta FAIL or counsel/engine dead-end |

---

## Priority (FR only — decide with risk)

```
P0  YOU (after wake)     Seeta desk prove (no code)
P1  mob-fr-seeta-align-crop   Affine align using Seeta pts (crop quality)
P2  mob-fr-rail-blur-reject / grab speed   if snaps still junk/slow
P3  MediaPipe detect POC     only if Seeta detect FAIL on BWC
P3  OpenVINO matcher POC     only if Seeta match FAIL after align
P4  Full C++ MediaPipe+OV rewrite   last resort product bet
```

**Do not** APPLY MediaPipe+OpenVINO “architecture replace” while Seeta is untested.

**Cropping change you asked for** = mapped to **P1 align**, not engine replace.

---

## Wake checklist (operator — after sleep)

1. Confirm Seeta `/health` (or tile/engine shows seeta).  
2. **Restart Fleet** if FR still old engine.  
3. Watchlist **Re-embed gallery** (dims 1024).  
4. Enroll-from-BWC or Score known person — PASS/FAIL at 70%.  
5. Tell agent result → then decide **APPLY `mob-fr-seeta-align-crop`** or not.

---

## Relation to WVP latency priority

Separate genre. WVP soft-chase and FR Seeta/align do **not** share APPLY. One named MOB at a time.

---

## One line

**Google’s align step we want; MediaPipe+OpenVINO is a later alternate stack — finish Seeta wake prove first, then Seeta landmark affine crop; on “i am back” after 3h+ agent reminds Seeta + crop.**
