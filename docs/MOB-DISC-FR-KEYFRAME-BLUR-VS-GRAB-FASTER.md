# MOB DISC — Grab still too slow / blurry · how Chinese stacks pick keyframes · free detect/crop

**Status:** DISC only — **no APPLY**  
**Date:** 2026-07-14  
**Trigger:** Operator: grab-faster still not fast enough; **many blur screens**; check how Chinese do keyframes; many free detect/crop engines.  
**Related:** `MOB-DISC-FR-BEST-FRAME-KEYFRAME.md`, Seeta path disc, `mob-fr-snap-grab-faster` APPLIED.

---

## Plain verdict

| Complaint | Truth |
|-----------|--------|
| Still not fast enough | Cutting wait helped a bit; **heavy face pack + multi-still harvest** still dominate. Speed alone won’t feel “Chinese VMS snappy.” |
| Many blur screens | **Expected trade-off** after grab-faster: shorter still window → more mushy JPEGs get through. We sped the camera shutter; we did **not** add a “only show sharp faces” gate on Recent. |
| How Chinese do it | **Not** “grab faster and hope.” They **detect → score quality (blur/pose/size) → keep best frame → then recognize.** Blurry faces are **dropped**, not shown. |
| Free detect/crop? | Yes — many. Recognition (who is it) is the hard licensed part; **detect + crop + blur score** is mostly free CV / open models. |

**Rule:** Faster grab without a **blur reject / best-shot** step = **more blur on Recent**. That is what you are seeing.

---

## What we have today (honest)

| Step | Today | Gap |
|------|--------|-----|
| Take still from live video | Shorter wait (grab-faster) · **2** stills per round | Still not “instant”; still can be soft |
| Pick sharpest of those 2 | We **do** pick sharper among candidates when scores exist | Only **2** samples; short grab → both can be mush |
| Show on Recent | Often shows whatever scored — **weak blur floor on live rail** | Blur cards still appear |
| Enroll photo | Stronger blur check | Live path is softer |
| Chinese-style quality module | **Not wired** (comes with Seeta open: clarity / brightness / pose) | Waiting on Seeta lab |

So: we already had a thin “best of N” idea. Grab-faster made N frames **worse**, so “best of mush” is still mush.

---

## How Chinese open stacks do keyframes (desk language)

**SeetaFace6 open** (the path we settled):

1. Detect face  
2. Landmarks  
3. **Quality** — clarity / blur / brightness / pose / size (their `quality_lbn` + clarity rules)  
4. If **BLUR** → **throw away** (do not enroll / do not alarm on that frame)  
5. Only a **good** face goes to recognition  

That is the industry “keyframe” idea for bodycams: **wait for a sharp frontal enough shot**, don’t decorate the wall with garbage.

Other free pieces often used the same way:

| Free piece | Job | Legal-ish |
|------------|-----|-----------|
| **OpenCV** (Laplacian / variance) | Blur score — we already use this on enroll | Fine |
| **Seeta** detector + quality | Detect + blur/pose gate | Open edition commercial-free claim |
| **SCRFD / RetinaFace-class** (various OSS) | Detect | Check **each** weight license |
| **YuNet / OpenCV Zoo** | Detect | Often Apache |
| **LibFaceDetection / Ultra-Light** | Fast detect | Check license |

**Recognize “who”** (Seeta / paid InsightFace / etc.) comes **after** detect+quality.  
Don’t confuse “free detect” with “free strong ID match.”

---

## Why “just grab faster” fails

```
Want: fast + sharp Recent
Did:  shorter shutter
Got:  faster mush
Need: enough samples OR longer shutter on motion + HARD reject blur before Recent
```

Chinese desks accept a short delay if the **card is sharp**.  
Showing blur instantly is worse than a half-second wait for a clean face.

---

## Next MOBs (pick later — many more)

| # | MOB | Plain |
|---|-----|--------|
| **A** | `mob-fr-onnx-pack-off` | Take heavy InsightFace pack off (already agreed) — helps CPU/snap load |
| **B** | `mob-fr-rail-blur-reject` | **Don’t show** Recent faces below blur floor (hide mush; wait for better) |
| **C** | `mob-fr-keyframe-window-restore` | Ease grab wait a bit **and/or** back to 3 stills, keep only sharpest — less blur, slightly slower |
| **D** | `mob-fr-seeta-windows-lab-proof` | Wire Seeta — their **quality + detect** is the Chinese keyframe path |
| **E** | `mob-fr-seeta-quality-gate-live` | After Seeta: live uses their blur/pose gate before Recent/match |

**Recommended order for your complaints tonight:**

1. **`mob-fr-onnx-pack-off`** (stop the heavy pack tax)  
2. **`mob-fr-rail-blur-reject`** (stop blur spam on Recent — biggest UX win without Seeta)  
3. **`mob-fr-seeta-windows-lab-proof`** (real Chinese detect/quality/recognize stack)

Optional if blur is unbearable right now: **`mob-fr-keyframe-window-restore`** (slightly slower, sharper).

---

## What we will not do

- Another “cut grab to 400ms” MOB hoping blur magically disappears  
- Pretend DeepFace is the keyframe engine  
- Lower the **70%** match bar to hide bad crops  

---

## Bottom line

Grab-faster **traded sharpness for speed** — you got blur.  
Chinese way = **quality gate + best frame**, then match. Free detect/crop/blur tools exist; **Seeta** bundles that properly.  

Next when you want code:

```text
MOB-APPLY mob-fr-onnx-pack-off
MOB-APPLY mob-fr-rail-blur-reject
```

(or Seeta lab proof when you’re ready for the engine wave)
