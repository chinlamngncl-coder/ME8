# MOB DISC — FR master plan: align locked + I-frame + industry UI (no more “decide?”)

**Date:** 2026-07-15 ~01:14  
**Status:** **PLAN LOCKED** — discussion / paper only until wake Seeta prove then named APPLY  
**Operator:** Stage 1.5 good? → **Yes, we take it.** Stop asking; take best path. Cropping without **I-frame** hurts match. Watchlist + crop UI is raw — correct soon using industry patterns. Google/MediaPipe notes absorbed as input, not thrash.

**Wake reminder:** on **`i am back`** after ≥3h — remind Seeta prove + this plan (align + I-frame + UI genre).

---

## Verdict (not a question)

**Stage 1.5 eye align (BWC tilt) = GOOD. It is in the plan. We will do it.**

Reason (industry + our glass):

- BWC faces are rolled/tilted; box crop alone feeds garbage geometry to the embedder.  
- Align from eyes → level face → large real-world lift (Google’s “~30%” is marketing; the **direction** is standard FR pipeline).  
- Seeta already ships **`face_landmarker_pts5`** — we align **inside Seeta path**, not MediaPipe rewrite first.

Also locked: **prefer I-frame / sharp keyframe for crop+match**, not random P-frame mush. (Read “iframe” as **I-frame** / keyframe — same industry rule as prior `MOB-DISC-FR-BEST-FRAME-KEYFRAME.md`.)

---

## Pipeline we are building toward (best of software)

```
ZLM / BWC still
    → prefer I-frame or sharpest of short window   [quality gate]
    → Seeta detect + landmarks
    → OpenCV affine align (eyes level)             [Stage 1.5 — LOCKED]
    → Seeta embed + cosine vs watchlist @ 70%
    → UI: identity card + crop preview (enterprise)
```

**Not first:** full MediaPipe C++ + OpenVINO replace (park until Seeta+align fail).

---

## Ordered work (agent executes; no “which do you prefer?”)

| Order | After wake | Job |
|-------|------------|-----|
| **0** | Ops | Seeta desk prove (Fleet restart, Re-embed, Score/enroll-BWC) |
| **1** | `MOB-APPLY mob-fr-seeta-align-crop` | Landmark → affine → embed; live + enroll + BWC enroll use **aligned** crop |
| **2** | `MOB-APPLY mob-fr-iframe-or-sharp-pick` | Grab/keyframe: I-frame or N-frame sharpness pick before detect (tie to existing best-frame disc) |
| **3** | `MOB-APPLY mob-fr-watchlist-crop-ui-polish` | Watchlist + video crop UI → industry shape (below) |
| **4** | Only if 0–2 FAIL | MediaPipe detect POC / OpenVINO — alternate stack |

WVP soft-chase stays **other genre** — one MOB at a time.

---

## Industry powerhouse patterns (for UI correct-soon)

Sources: Milestone **BriefCam** docs, **i-PRO / Genetec** Active Guard face search, **海康** 人脸库 / 比对 UX norms.

| Pattern | What they offer | Our UI today (honest) | Target |
|---------|-----------------|------------------------|--------|
| **Face library = identities** | Named person, **multi-photo** same identity, combine/merge | Raw watchlist cards | Identity row + face chips |
| **Enrollment quality** | Star/quality gate; reject no-face / 1-star; face ≥ ~¼ of frame; centered | Soft gates uneven | Show **aligned preview** + quality before save |
| **Pick face in photo** | Detect → operator picks box if multi-face | Weak / raw | Click face → confirm crop |
| **Search modes** | By name **and** by image (以图搜图) | Partial | Keep Score + clear “search by photo” |
| **Alert glass** | Capture **vs** library face **side-by-side** + % | Rail / chips rough | Side-by-side match card |
| **Enrollment photo advice** | ID-style / plain background (海康); BriefCam face-centric | Operator guesses | Short on-glass hints under crop |
| **Watchlist ops** | Create list, threshold, enable compare | Present but raw chrome | Calmer enterprise chrome (Axiom, not OEM names) |

**OEM ban:** use patterns only — no Hik/BriefCam/Genetec branding in product UI.

UI MOB does **look** + layout + enroll confirm — **not** another engine.

---

## How Google help was taken

| Google / share | Plan status |
|----------------|-------------|
| Align affine from eyes | **LOCKED → MOB 1** |
| MediaPipe BlazeFace | Park (Seeta detect first) |
| OpenVINO matcher | Park (Seeta matcher first) |
| I-frame from media | **LOCKED → MOB 2** (with sharp-pick) |
| Kill DeepFace as strategy | Already parked |

---

## Success criteria (no debate loop)

| Gate | PASS |
|------|------|
| Seeta wake | Health + embed + score path works on desk |
| Align | Same person: aligned enroll/live beats box-only (ops eyes + %) |
| I-frame/sharp | Fewer mush crops on walking BWC |
| UI | Watchlist enroll shows clear face preview; less “lab raw” |

---

## One line

**Eye align is good and locked; I-frame/sharp pick locked next; then watchlist/crop UI to industry identity+quality patterns — Seeta prove on wake, then APPLY those MOBs in order without more choose-your-adventure.**
