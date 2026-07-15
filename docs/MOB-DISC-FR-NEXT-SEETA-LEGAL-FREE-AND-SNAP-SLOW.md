# MOB DISC — Next FR path: Chinese legal-free engines + why snap got slow

**Status:** Seeta lab proof MOB applied (`mob-fr-seeta-windows-lab-proof`) — sidecar :8767; live still onnx until cutover  
**Date:** 2026-07-14  
**Trigger:** Operator: stop DeepFace rollback talk; find **good Chinese** algorithm that is **legal free**; snap stupidly slow; **many more** MOBs later.  
**Lock:** Match bar stays **70%**. Not legal advice — counsel before customer ship.

---

## Plain English first

| You want | Straight answer |
|----------|-----------------|
| Keep rolling back to DeepFace? | **No.** Agreed — not good enough. |
| Keep gambling on tonight’s InsightFace pack? | **Lab only** — match still failed (~38%); model pack is **not free for customer ship** without paid license. |
| Best **Chinese + free commercial story** for Ubitron? | **SeetaFace6 open edition** (中科视拓) — already reserved in our code as `seeta`, **not wired yet**. |
| Why Recent / snap feels dead slow? | Heavier face pack + we still grab **3 pictures** per cam every few seconds, each grab waits ~1–2s. Slow is mostly **photo taking**, not the Score button. |

---

## What we already have (honest inventory)

| Piece | Status | Quality at 70% | Ship legal (models) |
|-------|--------|----------------|---------------------|
| Live tiles + Recent snaps | Working | Snaps OK | OK |
| Watchlist enroll / Score (plain card) | Working | **FAIL** (~38% last test) | — |
| DeepFace (backup engine) | Wired | Operator: **not good enough** | Facenet path = old; don’t make it the plan |
| InsightFace ONNX (current lab) | Wired | **FAIL** under 70 | Code OK; **pretrained packs research-only** unless paid |
| **SeetaFace6** | **Lab sidecar :8767** (proof MOB) | Bench via `/test-seeta.html` | Open edition: **BSD + vendor says free commercial/personal** — still counsel-check |
| Enroll from bodycam photo | Not built | Likely helps domain gap | N/A |
| Score UI plain line | **Done** | — | — |

**Conclusion:** We have a **desk and a pipeline**. We do **not** yet have a **ship-safe + strong** Chinese recognizer running. Next big bet is **wire Seeta**, not “try DeepFace again.”

---

## Chinese / Asia stacks — legal free vs paywall (short list)

| Rank | Name | Who | Legal free for product? | Quality / speed story | Fit for ME8 |
|------|------|-----|-------------------------|----------------------|-------------|
| **1** | **SeetaFace6 Open** | 中科视拓 / ICT | **Best candidate** — BSD-style LICENSE; README: free commercial + personal (confirm with counsel) | Vendor: MobileFaceNet ~9ms/face class; ResNet50 stronger/slower; trained on huge data | **#1 next engine** — slot already named `seeta` |
| **2** | **FaceX-Zoo** | 京东 AI (JDAI) | **Apache 2.0** code | Research toolbox; good for train/export; **not** a fast Windows sidecar by itself | R&D / export ONNX later |
| **3** | **Paddle face / ArcFace-Paddle** | 百度飞桨 ecosystem | Often **Apache 2.0** for code + their published demos — **verify each model file** | Solid China stack; heavier Python ops | Option if Seeta Windows blocks us |
| **4** | InsightFace buffalo / InspireFace | InsightFace | **Models = research / paid commercial** | Strong lab accuracy possible | **Lab only** or **buy license** — not “legal free ship” |
| **5** | DeepFace Facenet | Current backup | Mixed / old | Operator rejected | **Park as strategy** |

**Operator rule:** “Legal free” = we can put it in a **customer box** without a surprise invoice. That points to **SeetaFace6 open** first, then Paddle/FaceX-Zoo export if Seeta Windows fails.

---

## Why snapshot became stupidly slow (DISC — causes)

Not magic. Stacked delays:

| Cause | What happens | After pack upgrade |
|-------|----------------|-------------------|
| **A — Heavier face brain** | New pack is much bigger than the tiny lab pack → each face check costs more CPU | **Yes — makes Recent feel sluggish** |
| **B — Three grabs per window** | Every poll: take **3** stills (~350ms apart), then score | Still on |
| **C — Each grab waits** | Still capture window often **~1–2 seconds** before a JPEG is ready | Still on |
| **D — Poll every ~2s × up to 6 cams** | Many cameras × grabs = queue | Still on |

So: **slow snap ≈ camera still harvest + heavier engine**, not “Score vs last snap” alone.

**Later speed MOBs (plain names):**

| MOB | Plain |
|-----|--------|
| `mob-fr-snap-grab-faster` | Shorter wait per still (careful — too short = blank faces) |
| `mob-fr-snap-one-grab-lab` | Lab: 1 still instead of 3 when proving match |
| `mob-fr-engine-light-when-seeta` | After Seeta: use their **small** model for live rail, big model for enroll if needed |

---

## Recommended direction (no DeepFace rollback)

```text
Stay off DeepFace as the “fix”
Do not pretend InsightFace pack is ship-cleared
Next quality bet = SeetaFace6 Open (Chinese, commercial-free claim)
In parallel: optional bodycam enroll + snap speed MOBs
```

### Wave plan (many MOBs — you pick APPLY one at a time)

| # | MOB id | Plain what you get | Risk |
|---|--------|--------------------|------|
| **1** | `mob-fr-seeta-windows-lab-proof` | Install/run Seeta on this PC; one photo in → one % out (test page / health) | Medium — native Windows |
| **2** | `mob-fr-seeta-sidecar-wire` | Same desk APIs as today; engine switch = Seeta | Medium–High |
| **3** | `mob-fr-gallery-re-enroll-seeta` | Rebuild Watchlist fingerprints for Seeta | Medium |
| **4** | `mob-fr-seeta-score-at-70` | Same person live must **≥70** on Score | Checkpoint |
| **5** | `mob-fr-enroll-from-bwc-still` | Enroll from bodycam face (domain) | Low–Medium |
| **6** | `mob-fr-snap-grab-faster` | Recent feels snappier | **APPLIED 2026-07-14** — grab 900ms, 2 stills/window |
| **7** | `mob-fr-snap-one-grab-lab` | Faster lab polls while proving match | Low |
| **8** | `mob-fr-paddle-or-facex-export-fallback` | If Seeta Windows blocked → Paddle/FaceX export path | Later |
| **9** | `mob-fr-insightface-commercial-or-drop` | Either **buy** InsightFace model license or **drop** buffalo from ship pack | Business |

**Start when ready:**

```text
MOB-APPLY mob-fr-seeta-windows-lab-proof
```

Or if snap pain is worse than match tonight:

```text
MOB-APPLY mob-fr-snap-grab-faster
```

---

## What we will **not** do (locked by you)

- “Just use DeepFace” as the recovery plan  
- Lower the **70%** bar  
- Dump raw engine/file lines on the Score card again (plain card stays)  
- Claim buffalo pack is free for customer ship  

---

## Bottom line

**Match:** current lab engine **failed** 70%. Next serious Chinese **legal-free** bet = **SeetaFace6** (already reserved — now build it).  
**Snap slow:** heavier pack + 3× still grabs — fix with named speed MOBs, not more DeepFace.  
**Many more MOBs** listed above — you name one APPLY when you want motion.

Related older disc: `MOB-DISC-FR-ENGINE-SEETAFACE6-FACEXZOO.md` (2026-07-10). This doc updates that with **tonight’s FAIL + slow snap + no-DeepFace rule**.
