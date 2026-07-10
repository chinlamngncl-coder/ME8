# MOB DISC — FR slow · 6–7 snaps / 1 match · engine vs open-source stacks

**Status:** DISC only — no APPLY  
**Date:** 2026-07-10  
**Trigger:** Operator FAIL — same person, many rail tiles, **one** hit; feels lousy vs fast side-angle FR elsewhere  
**Search:** slow FR, match rate, threshold, InsightFace, ArcFace, SCRFD, DeepFace, opencv detector  
**Related:** `MOB-DISC-FR-SNAPSHOT-RAIL-THRESHOLD.md`, `MOB-DISC-FR-SNAP-RAIL-PROPORTION-GRID.md`

---

## Verdict — you are right to complain

The behaviour is **explainable** and **not** “good operational FR” yet. It is **not** mainly the UI threshold slider. The stack is **lab-grade DeepFace + weak detector + slow grab + single-frame match + strict crop gates** — while many **open-source Chinese/community pipelines** use **SCRFD + ArcFace + normalized cosine + multi-frame confirm**.

**Git check (ME8):** `origin` = `github.com/chinlamngncl-coder/ME8.git`. FR path is **`fr-sidecar/app.py` (DeepFace Facenet/SFace)** + `lib/frLivePoller.js`. **No InsightFace / ArcFace / SCRFD code in this repo** — not forked from those projects. Switching engine = **new sidecar MOB**, not a slider fix.

---

## Why 6–7 snapshots but ~1 match (code truth)

| What you see | What code does |
|--------------|----------------|
| 6–7 similar rail tiles | **Rolling rail** — one tile per **good grab** across poll cycles (`FM_FR_ROLLING_RAIL`) |
| “Almost same pic” | Same person, different JPEG / box / sharpness — **not deduped on rail** |
| Only 1 alarm / match | **Match runs once per poll window** on **sharpest of 3 grabs** — rail tiles are emitted with **`match: false`, `scorePct: 0`** (no per-tile scoring) |
| Higher threshold “shouldn’t match 5–6” | Those 5–6 **were never scored on rail** — only the window winner is compared to watchlist |
| 45s silence after one hit | `FM_FR_HIT_DEDUPE_MS` default **45000** — suppresses repeat alarms same person+cam |

So: **many snaps ≠ many match attempts**. That feels broken to operators; industry shows **score on each sighting** or **N-of-M confirm**.

---

## Why it is slow

| Bottleneck | Default | Effect |
|------------|---------|--------|
| JPEG grab | `FM_FR_GRAB_MS` **3500** | Up to ~3.5s wait per still from live pool |
| Multi-grab window | **3** grabs × **350ms** gap | + sidecar represent each |
| Poll interval | **2s** + `busy` lock | Cams probed **serially** |
| Sidecar | **DeepFace + TensorFlow** CPU | Cold / heavy per `/represent-probe` |
| Quality gates | blur, clip, composition, scene | Many grabs → **skip** (no embed) |
| Live path | mpeg1 WS → ffmpeg 1 frame | Soft, compressed vs enroll ID photo |

Open stacks target **&lt;100ms embed** (ONNX GPU) and **15–30 FPS** detect on one stream — we are **seconds per cam per tick**.

---

## Why match rate is poor (even front face)

| Issue | Detail |
|-------|--------|
| **Detector** | `FM_FR_DETECTOR` default **`opencv`** — weak vs profile/side; **jittery boxes** → embedding swings |
| **Model** | **Facenet** via DeepFace — older than ArcFace; not tuned for BWC MPEG artifacts |
| **Score math** | `matchProbe` = **raw cosine × 100** on gallery vectors — **no L2 normalize**; verify API uses **different** distance→% mapping (`_distance_to_score_pct`) — **enroll vs live not calibrated as one scale** |
| **Domain gap** | Enroll = crisp ID mugshot (160px+ gate); probe = wall JPEG, scene crop, compression |
| **Crop churn** | Strict scene/full-face gates change crop content frame-to-frame → embed variance |
| **Threshold UI** | 75–99% on **uncalibrated cosine** — operator expectation (ID software) ≠ our math |

Result: **same person visually**, scores hop above/below threshold — “lousy” and “strange” are expected on this stack.

---

## What strong open-source stacks do (incl. widely used CN/community repos)

Representative **free / OSS** pattern (not product endorsement):

| Layer | Typical stack | Repo examples |
|-------|---------------|---------------|
| Detect | **SCRFD** / RetinaFace | [deepinsight/insightface](https://github.com/deepinsight/insightface) (~29k★) |
| Embed | **ArcFace** `buffalo_l` / `buffalo_sc` | Same; ONNX packs |
| Search | **FAISS** IndexFlatIP on **L2-normalized** vectors | e.g. zerokhong1/face-recognition-system, jane-kirina/real_time_face_recognition |
| Speed | ONNX Runtime / TensorRT | mujeebawan/face-recognition-security-system (edge GPU) |
| Side pose | 5-point align before embed | Standard in InsightFace pipeline |
| Alert logic | **Temporal**: e.g. 3 frames / 1s above τ | Not single lucky frame |

**InspireFace** (InsightFace team, 2024) — C/C++ SDK for embedded — same idea: fast detect + ArcFace.

**Why they feel “top fast”:** one ONNX graph, good detector, normalized cosine, GPU, **match every frame** or short buffer — not 3.5s ffmpeg grab + TF DeepFace per tick.

**VGG-Face:** we correctly **forbid** (non-commercial). **InsightFace/ArcFace:** MIT/BSD components available — legal review before ship, but viable for lab eval MOB.

---

## ME8 git — no hidden Chinese engine

| Checked | Result |
|---------|--------|
| `ME8` remote | `chinlamngncl-coder/ME8` — your tree |
| `fr-sidecar` history | Part of ME8 POC commits — **DeepFace from day one** |
| InsightFace / PaddleFace in repo | **Not present** |
| `good code` workspace | Separate mirror; same FR pattern |

To “check git on Chinese developers”: **clone/eval upstream**, don’t expect it inside ME8 already.

---

## Locked recommendation (phased — one MOB at a time)

### Phase A — Honesty + quick wins (low risk)

| MOB | Fix |
|-----|-----|
| `mob-fr-rail-per-tile-score` | Run `matchProbe` on **each** rail grab; show **%** on tile (operator sees why miss) |
| `mob-fr-score-normalize` | L2-normalize embeddings at enroll + probe; single threshold table |
| `mob-fr-temporal-hit` | Hit only if **2-of-3** windows above τ (or max score in 2s) — kills one lucky frame |
| `mob-fr-pipeline-tune` | `GRAB_MS` 1200, `POLL_SEC` 1, detector **retinaface** (DeepFace backend) — bench before lock |

### Phase B — Engine eval (medium risk, checkpoint)

| MOB | Fix |
|-----|-----|
| `mob-fr-sidecar-insightface-poc` | Parallel sidecar: SCRFD + ArcFace ONNX, same REST shape; A/B vs DeepFace on **your** enroll + BWC clips |
| `mob-fr-faiss-gallery` | Replace linear JSON cosine scan (fine at 5k) — optional |

### Phase C — Product SOP (with alert UX disc)

| MOB | Fix |
|-----|-----|
| `mob-fr-hit-map-sos-parity` | Map + team (already disc’d) |
| `mob-fr-ack-incident-record` | Sighting record with **best score + frame count** |

**Do not:** more crop MOBs hoping match fixes itself. **Do not:** stack Phase A + B in one pass.

---

## Bench protocol (before any engine swap)

1. Fixed enroll photo + 20 BWC stills (front + slight side) — label ground truth  
2. Record: detect rate, embed ms, cosine distribution same-person vs impostor  
3. Target: same-person **p50 ≥ τ**, different-person **p95 &lt; τ** — then set UI default  
4. Compare: current DeepFace/opencv vs InsightFace `buffalo_sc` CPU  

Pass criteria for engine MOB: **≥2× faster embed** and **same-person recall ↑** on bench set without SOS/PTT regression.

---

## Operator FAQ (short)

| Question | Answer |
|----------|--------|
| Is threshold broken? | Partially — scale is **uncalibrated cosine**, not “ID software %” |
| Why only 1 match? | **One match attempt per window** + dedupe + rail not scored |
| Will higher threshold help? | Can **reduce** false alarms; won’t fix **missed** same-person |
| Chinese OSS free? | **InsightFace** etc. — yes for eval; ship needs license check |
| Fix in crop MOB? | **No** — engine + scoring + temporal logic |

---

## APPLY commands (when you pick — not now)

```text
MOB-APPLY mob-fr-rail-per-tile-score
MOB-APPLY mob-fr-score-normalize
MOB-APPLY mob-fr-sidecar-insightface-poc
```

Start with **`mob-fr-rail-per-tile-score`** + **`mob-fr-score-normalize`** if you want proof on screen before engine swap.

---

## Bottom line

Current path is **honest lab POC**, not operator-grade watchlist FR. Your screenshot rail proves **detection/capture**; **matching** is starved and miscalibrated. Industry-fast stacks = **better detector + ArcFace-class embed + normalized search + multi-frame confirm**. ME8 git does not contain that yet — **deliberate next genre**, not another crop tweak.
