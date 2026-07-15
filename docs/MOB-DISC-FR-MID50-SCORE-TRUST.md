# MOB DISC — Mid-50% scores: is matching wrong? (same person / BWC near)

**Status:** DISC only — **no APPLY**  
**Date:** 2026-07-13  
**Trigger:** Screenshot Recent — some snaps **56–59%**, some **no %**; operator: “impossible mid-50s, almost same pic, BWC so near — matching correct?”  
**Lab facts:** Engine onnx UP · gallery `dd` 512-d · enroll photo **self-match 100%** · threshold UI default **75**

---

## Plain answer

**Two different questions:**

| Question | Answer |
|----------|--------|
| Why **some** snaps have % and **some** don’t? | **By design** after window-score MOB — rolling faces = no %; ~1 best frame per poll window = real % |
| Is **56%** “broken” for the same person? | Math is likely **correct cosine**; the **scale + threshold** are still DeepFace-era (**75%**). For ONNX ArcFace-class (`buffalo_sc`), mid-50s on BWC vs enroll is **plausible same-person**, not “random stranger” |

So: matching is probably **not inventing garbage**. It is **under-calling hits** because we treat ArcFace cosine×100 like old Facenet “75% = match.”

---

## Why some have %, some don’t

```text
Rolling grab  → face only → no %     (most of the grid)
Window winner → matchProbe → 56%…    (few cards)
```

That part is **working**. Not a bug that half the tiles lack a number.

---

## How score is computed (check)

```text
scorePct = round( cosineSimilarity(probeEmb, galleryEmb) × 1000 ) / 10
```

- Probe: live still → ONNX `/represent-probe` → `normed_embedding`  
- Gallery: enroll photo → same engine → stored 512-d  
- Same dims required or entry skipped  

Enroll photo **vs itself** in lab = **100%** → engine + gallery vector path are healthy.  
Live BWC still **vs `dd`** = **~56–59%** in your shot → live domain gap + threshold culture, not “sidecar missing.”

---

## Why “same person near lens” can still be ~55%

Honest reasons (not excuses):

1. **ArcFace cosine ≠ human “looks identical” %** — industry thresholds often sit around **~0.35–0.45** cosine (35–45% on our scale), not 75.  
2. **Enroll photo ≠ BWC grab** — compression, wide-angle, exposure, slight pose, JPEG from stream.  
3. **Padded crop on rail** is for display; embed is from detector on the still — still can differ from ID still.  
4. **Threshold 75** was tuned for **Facenet** lab feel — never re-calibrated for `buffalo_sc` after cutover.

**Your gut is right that 56% “feels” too low for “same guy.”**  
**Your gut is wrong that 56% means the formula is random** — under ArcFace scale it can still be the same identity, just **below our inherited 75 bar**.

```text
Same person (BWC)     ~50–70%   ← you are here
Threshold (UI)            75%   ← Facenet legacy
Known subjects / alert    only if ≥ 75
```

So Known subjects stays empty even when the engine “kind of” agrees it’s you.

---

## Are we sure matching is correct?

| Check | Status |
|-------|--------|
| Dim align onnx↔gallery | OK (512) |
| Self-match enroll | OK (100%) |
| Cosine formula | Standard (same as industry) |
| Live % visible | OK after `mob-fr-rail-window-score` |
| Threshold fair for onnx | **No — suspicious** |
| Live crop vs enroll offline A/B | **Not automated yet** — next proof MOB |

**Confidence:** formula OK · **calibration wrong** · need one offline live-crop vs enroll measure to lock.

---

## What we should do next

| # | Action | MOB? |
|---|--------|------|
| **1** | Lower slider to **50–55**, walk-test — if Known subjects fires for `dd`, engine is “right enough” | No |
| **2** | `mob-fr-onnx-threshold-calibrate` — ship default match min for onnx (~**52–58** or env `FM_FR_MATCH_MIN`) separate from DeepFace 75 | Yes |
| **3** | `mob-fr-match-debug-enroll-vs-live` — tech/API: score latest live crop vs gallery photo (one button / log line) | Yes |
| **4** | Re-enroll from a **BWC still** of `dd` (same camera family) — often lifts live % more than restart | No |

**Do not** restart FR hoping 56% → 95%.  
**Do not** assume mid-50s = stranger on ArcFace without calibration.

---

## Apply cheatsheet (when you choose)

```text
MOB-APPLY mob-fr-onnx-threshold-calibrate
MOB-APPLY mob-fr-match-debug-enroll-vs-live
```

---

## Bottom line

| Your concern | Verdict |
|--------------|---------|
| Some % / some none | Expected (rolling vs window) |
| ~56% same person | Plausible for onnx; **75 threshold is the villain** |
| Matching broken? | Unlikely install/math — **scale/threshold + enroll domain** |
| Next | Try threshold **55** now; then calibrate MOB |
