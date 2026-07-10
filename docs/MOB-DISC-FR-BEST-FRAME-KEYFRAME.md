# MOB DISC — Best-frame / keyframe face crop (BWC walking)

**MOB DISC ONLY — no code.**  
**Date:** 2026-07-10  
**Search:** `keyframe`, `best frame`, `blur`, `laplacian`, `represent-probe`, `BWC walking`, DeepFace quality  
**Related applied:** `mob-fr-crop-rail-8-compact` (rail UI only — does **not** fix blur)

---

## Your complaint (accepted)

> Snapping/cropping is lousy — almost every face crop is blurred. BWC is walking. We must find the **best frame** to crop, not stupidly crop the first face we see. Industry keyframe selection matters. Does DeepFace even have this?

**Accepted.** Current live/offline path is **detect-on-this-frame → crop → match**. Motion blur from walking BWCs makes that look like a toy. That is a **pipeline design gap**, not “operator error.”

---

## What we do today (why crops are mush)

```
Live:   every POLL_SEC → grab 1 JPEG from stream → represent-probe → crop if any face
Offline: ffmpeg 1 fps samples → each JPEG → represent-probe → crop if any face
```

| Layer | Behavior |
|-------|----------|
| Grab | One still per tick / per sample — **no** multi-frame window |
| DeepFace probe | Detector confidence only — **no** “pick sharpest of N” |
| Enroll gate | We **do** have Laplacian blur reject on **enroll** |
| Live/offline probe | **Does not** apply that sharpness gate before showing crop / matching |

So: first detectable face wins, even if blurry. Walking BWC → high chance of mush.

---

## Honest answer: Does DeepFace “have keyframe skill”?

**No — not as a built-in video keyframe engine.**

| Claim | Reality |
|-------|---------|
| DeepFace “best in class / AWS / Google” marketing | DeepFace is a **popular open wrapper** around detectors + models (Facenet, SFace, ArcFace, RetinaFace, …). Cloud vendors sell **managed video FR pipelines** with their own trackers + quality filters. Different product class. |
| `extract_faces` / `represent` | Per-**image**. Returns faces the detector found. Confidence ≠ sharpness. |
| Maintainer stance (GitHub) | Quality/sharpness filtering is **not** DeepFace’s job — “depends on detector confidence”; blur/partial filter was **declined** as a core feature. |
| What *we* already reuse | Laplacian variance on enroll crops — classic CV, **not** a DeepFace API. |

So: DeepFace is a solid **embedding + detect** toolkit. **Best-frame selection for video is our (or any VMS vendor’s) pipeline responsibility.** Calling DeepFace alone “enterprise video FR” without a quality/keyframe stage is overselling.

Industry (FindFace / Genetec-style / bodycam analytics) typically:

1. **Track** face across frames (same person id over time)  
2. **Score** each observation (sharpness, size, frontal, lighting)  
3. **Emit** one crop / one match when score peaks or track ends  
4. Optionally reject below quality floor (no rail spam)

That is **keyframe / best-shot selection** — not “see face → crop.”

---

## Target product bar (Ubitron)

```
Window of N frames (live: last 2–4 s · offline: cluster nearby samples)
    → detect faces per frame
    → score each face crop (sharpness + face size + optional frontal)
    → keep BEST per track / per cam debounce window
    → only then: show rail + 1:N match + alarm
```

**Reject** (no rail card): below sharpness floor or face too small — same spirit as enroll soft-quality, tuned for field video (softer than ID enroll).

---

## Proposed scoring (v1 — no new ML license)

Reuse what we already trust on enroll:

| Signal | Source | Role |
|--------|--------|------|
| Laplacian variance | OpenCV on face crop (already in sidecar) | Sharpness |
| Face box area / short side | Detector `facial_area` | Prefer larger faces |
| Detector confidence | DeepFace/RetinaFace | Tie-break |
| Optional later | Pose / both-eyes | Frontal preference |

**Composite score** → pick max in window; debounce so one walking pass ≠ 20 mush cards.

---

## Proposed MOBs (do not bundle with rail compact)

| # | MOB | Intent | Risk |
|---|-----|--------|------|
| 1 | `mob-fr-probe-quality-gate` | Probe path: return `quality_blur` / skip emit if crop below live sharpness floor; include `sharpness` in tick | Med (sidecar + poller) — **Applied 2026-07-10** |
| 2 | `mob-fr-best-frame-window` | Live: buffer N grabs per cam over ~2–4 s; emit **one** best crop/match per window | Higher (timing/CPU) — **Applied 2026-07-10** (`FM_FR_BEST_FRAME_GRABS=3`, gap 350ms; OpenCV Laplacian already in sidecar — no new OSS) |
| 3 | `mob-fr-offline-best-of-cluster` | Offline: among nearby sampled frames with same rough face locus, keep best sharpness only | Med |

**Suggested order:** **1** (stop mush on rail) → **2** (true best-frame live) → **3** (offline).

**Applied #1 defaults:** `FM_FR_PROBE_MIN_SHARPNESS=15` (softer than enroll 25) · `FM_FR_PROBE_MIN_FACE_PX=48`. Sidecar must be restarted to load `app.py`.

Out of scope for v1: full ReID tracker, AWS Rekognition Video, paid FIQA models — park unless you buy that stack.

---

## What rail-8 did **not** fix

`mob-fr-crop-rail-8-compact` = UI density only. Blurry faces stay blurry until quality/best-frame MOBs.

---

## Success criteria (when we apply best-frame)

| Check | Pass |
|-------|------|
| Walking BWC past camera | Rail shows **fewer**, **sharper** crops |
| Mush frames | Mostly suppressed (no card or “low quality” internal skip) |
| Match | Fires on best window shot, not first blurry detect |
| CPU | Still ≤4 live slots; window capped |

---

## Bottom line

Your instinct is right: **keyframe/best-frame is mandatory for walking BWC.** DeepFace does **not** magically do that; enterprise vendors wrap detect+embed with **quality + temporal selection**. We already have Laplacian for enroll — extend it to **probe + multi-frame pick**.

Reply when ready, e.g. **`MOB-APPLY mob-fr-probe-quality-gate`** (first anti-mush step).
