# MOB DISC — FR engine pivot: SeetaFace6 vs FaceX-Zoo vs today (no APPLY)

**Status:** DISC only — **do not touch code** until bench + legal sign-off  
**Date:** 2026-07-10  
**Trigger:** ~40s for 6 images on DeepFace; operator wants fast, commercial-safe Chinese OSS stack  
**Search:** SeetaFace6, FaceX-Zoo, TenniS, MobileFaceNet, DeepFace rip-out, batch, load-once  
**Related:** `MOB-DISC-FR-ENGINE-SLOW-LOW-MATCH.md`, `MOB-DISC-FR-GENRE-COMMIT-PUSH-BASELINE.md`

---

## Executive answer

| Question | Answer |
|----------|--------|
| Is the Google/ChatGPT suggestion **directionally good**? | **Yes** — load-once + batch + new microservice is correct engineering. |
| Should we **rip DeepFace tomorrow**? | **No** — bench on **your** BWC stills + Windows lab first; parallel sidecar behind env flag. |
| **Best for Ubitron PoC (CPU, speed, commercial)?** | **SeetaFace6 MobileFaceNet** (9ms class on i7 per vendor table) — **if** Windows binaries + model redistribution are solved. |
| **Best if we stay Python-only?** | **InsightFace ONNX `buffalo_sc`** (not in your list but same league) **before** FaceX-Zoo for serving speed. |
| **FaceX-Zoo role?** | **Train / evaluate / pick backbone** — not our first production sidecar unless we export ONNX and still add a fast runtime. |

**Do not APPLY any engine MOB in the same pass as rail/alert UX.**

---

## “Two FR inside” ME8 today

Same **`fr-sidecar/app.py` (DeepFace)** — two **product doors**:

| Door | API / path | Use |
|------|------------|-----|
| **1:1 Verify** | `POST /verify`, `/verify-upload` | Analytics → **Verify 1:1** (two photos) |
| **1:N Watchlist** | `POST /represent`, `/represent-probe` | Enroll + **live watch** → `lib/frBlacklist.matchProbe` in Node |

Both are slow because **TensorFlow + DeepFace per call**, weak default **opencv** detector, and live path adds **ffmpeg grab** + serial probes.

**Any engine swap must replace both doors** (or clearly deprecate verify until ported) and **re-enroll watchlist** (embedding size changes).

| Engine | Typical embed dim |
|--------|-------------------|
| DeepFace Facenet (today) | 128 |
| SeetaFace6 MobileFaceNet | **512** |
| SeetaFace6 ResNet50 | **1024** |
| FaceX-Zoo (depends on backbone) | varies |

**No in-place embedding migration** — plan **re-enroll gallery** on cutover.

---

## Option A — SeetaFace6Open (ICT / Visionous)

**Source:** [SeetaFace6Open/index](https://github.com/SeetaFace6Open/index)

| | |
|--|--|
| **License** | Repo badge **BSD**; README states open edition **free for commercial and personal use** (verify with counsel + `LICENSE` file before customer ship). |
| **Runtime** | **C++** + **TenniS** inference (CPU; GPU source available). |
| **Speed (vendor table, i7-6700)** | MobileFaceNet **~9ms** / face; ResNet50 **~57ms**. |
| **Pipeline** | Detect → landmarks → quality → recognize (mask variants available). |
| **Python** | **No official** pip package — community **ctypes/pybind** wrappers (e.g. seetaface6ToPy, FacePythonAPI). |
| **Windows** | Official + community: **build pain** (VS vs MinGW) — lab risk for ME8 on Win10/11. |
| **Models** | Often distributed via **Baidu pan** links in community repos — ops/legal need **redistribution** plan for customer pack. |

**Why it fits Ubitron:** edge + local server, single DLL stack, commercial narrative, CPU PoC without GPU.

**Risks:** Windows integration, unofficial Python bindings, model hosting, team must maintain **native binaries** in ship tree.

---

## Option B — FaceX-Zoo (JD AI Research)

**Source:** [JDAI-CV/FaceX-Zoo](https://github.com/JDAI-CV/FaceX-Zoo) · **Apache 2.0**

| | |
|--|--|
| **License** | **Apache 2.0** — commercially safe, modification OK. |
| **Runtime** | **PyTorch** training toolbox + demo **face_sdk** (detect, align, feature). |
| **Speed** | **Research SDK** — not TenniS-class; CPU speed = backbone-dependent, typically **still >> SeetaFace6 Mobile** unless you export **ONNX/TensorRT** yourself. |
| **Strength** | Modular backbones (RepVGG, Swin, etc.), benchmarks, training pipeline, mask/robustness experiments. |

**Why it fits:** internal R&D, custom model choice, papers/benchmarks.

**Why not first for “40s → sub-second”:** still Python torch forward unless you add export + optimized runtime — **does not alone fix** live watch latency.

---

## Option C — still on the table (brief)

**InsightFace** (`buffalo_l` / `buffalo_sc`, ONNXRuntime): MIT/BSD components, **official Python**, easier Windows lab than SeetaFace6 compile, SCRFD + ArcFace — our prior disc `mob-fr-sidecar-insightface-poc`. **Compare in same bench** as SeetaFace6.

---

## Is the pasted “coding AI prompt” good?

**Keep (locked architecture principles):**

1. **Initialize engine + models once** at process start — never per request.  
2. **Batch** multiple image paths in one API call where live poller grabs N frames.  
3. **Return timings** in JSON (`detectMs`, `embedMs`, `matchMs`, `totalMs`).  
4. **Separate microservice** — keep `server.js` contract; swap `fr-sidecar` implementation.  
5. **L2-normalize** vectors; one similarity definition for enroll + live + verify.

**Adjust for ME8 (add to prompt):**

```text
- Preserve REST routes: /health, /represent-probe, /represent, /verify (or stub verify until ported).
- Env FM_FR_ENGINE=deepface|seeta|insightface — parallel bench, no big-bang delete.
- Windows lab path required; document model files in ship pack (no Baidu-only dependency for customer).
- Watchlist re-enroll after engine change; do not mix embedding dims in fr-blacklist index.
- Node frLivePoller: batch N grabs into one sidecar call per cam tick (after sidecar supports batch).
- Checkpoint: SOS/PTT/live unchanged; FR-only sidecar swap.
```

**Reject:** “completely ripping out DeepFace” in one commit **before** A/B bench on enrolled watchlist + 20 BWC stills.

---

## Recommended path for Ubitron (locked proposal)

### Phase 0 — Bench (you + lab, no prod swap)

| Step | Action |
|------|--------|
| 1 | Export 20 BWC stills + 1 enroll mugshot per test identity |
| 2 | Run **DeepFace (today)** vs **SeetaFace6 Mobile** vs **InsightFace buffalo_sc** — same images |
| 3 | Metrics: total ms for 6 images batch, same-person score p50/p95, impostor p95, side-angle frames |
| 4 | Legal: BSD (Seeta) + Apache (FaceX) + MIT (InsightFace) counsel one-pager for ship |

### Phase 1 — MOB (one at a time, after Phase 0 PASS)

| MOB | Deliverable |
|-----|-------------|
| `mob-fr-sidecar-seetaface6-poc` | New `fr-sidecar-seeta/` OR flag in sidecar; load-once; **batch `/represent-probe-batch`** |
| `mob-fr-poller-batch-grab` | Node sends 3 paths per tick in one HTTP call |
| `mob-fr-gallery-re-enroll-migrate` | Tool: re-embed all watchlist entries on new engine |
| `mob-fr-score-normalize` | Single cosine policy (Node + sidecar agree) |

### Phase 2 — Cutover

- Default `FM_FR_ENGINE=seeta` (or winner) on lab  
- Operator re-enroll or run migration script  
- DeepFace path kept **one baseline** tag for rollback  

**FaceX-Zoo:** use in Phase 0 only if Seeta/InsightFace bench fails accuracy on masked/side BWC — train/finetune, then **export** to ONNX/TenniS-class runtime, not raw torch in request loop.

---

## Winner matrix (for our product)

| Criterion | SeetaFace6 Mobile | FaceX-Zoo SDK | InsightFace buffalo_sc | DeepFace (today) |
|-----------|-------------------|---------------|------------------------|------------------|
| CPU speed | **★★★★★** | ★★ | ★★★★ | ★ |
| Commercial license clarity | ★★★★ (BSD + README) | **★★★★★** Apache | ★★★★ | ★★★ (Facenet OK; VGG banned) |
| Windows lab ease | ★★ | ★★★ | **★★★★** | ★★★★ |
| Side / mask | ★★★★ (mask model) | ★★★ (train) | ★★★★ | ★★ |
| Ship native binaries | required | PyTorch dep heavy | ONNX dlls | TF dep heavy |
| Fits “2 FR doors” | rebuild both | rebuild both | rebuild both | current |

**Recommendation:** **Primary bench = SeetaFace6 Mobile + InsightFace buffalo_sc**. **FaceX-Zoo = R&D toolbox**, not first production sidecar.

---

## What we explicitly do NOT do (until disc lifted)

- ❌ Delete `fr-sidecar/app.py` DeepFace  
- ❌ Change `pttServer`, live wall, SOS  
- ❌ Re-enroll production watchlist without operator OK  
- ❌ Bundle engine swap + UX MOBs in one push  

---

## APPLY commands (future — not now)

```text
MOB-APPLY mob-fr-sidecar-seetaface6-poc
MOB-APPLY mob-fr-poller-batch-grab
MOB-APPLY mob-fr-gallery-re-enroll-migrate
```

Start with **bench script MOB** only when you say: `MOB-APPLY mob-fr-engine-bench-disc` (optional doc + harness).

---

## Bottom line

Your instinct is right: **DeepFace is not the production engine**. The pasted **load-once + batch** prompt is **good engineering** — adapt it to **ME8’s two FR doors**, **Windows lab**, and **re-enroll**. **SeetaFace6** is the best match to your stated goals; **FaceX-Zoo** is complementary research, not the first speed fix. **Prove with numbers**, then one MOB — no rip-out blind.
