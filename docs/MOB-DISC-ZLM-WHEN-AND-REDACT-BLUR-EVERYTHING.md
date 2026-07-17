# MOB DISC — When ZLM again · Redact “blurs everything” FAIL

**Status:** LOCKED 2026-07-16  
**Search:** `when zlm`, `not just park`, `redact everything`, `what detector`, `why autoface`  
**ZLM park:** `docs/MOB-DISC-WVP-ZLM-GIVE-UP-PARKED.md` (ops path off — not “never think again”)  
**Redact applied:** `docs/MOB-APPLIED-EVIDENCE-REDACT-FACE-FOLLOW-V1.md`

---

## 1) When can we do WVP-ZLM?

**Not a miracle. Not “wait for God.”** Full how:  
`docs/MOB-DISC-WVP-STARTPLAY-HOW-NOT-MIRACLE.md`

| Gate | Meaning |
|------|---------|
| W1–W2 | Agent fixes WVP/ZLM stack (SSRC / RTP / host) |
| W3 | Only if still needed: lab device reachability for WVP play (your choice — no dictate all cams off 5060) |
| W4 | Proof: `live broker wvp-zlm primary` + picture |
| W5 | Ops wire with fail-open — new MOB after W4 |

**When:** next time you open that genre — say  
`MOB-APPLY mob-wvp-startplay-stack-fix-v1`  
Until W4 PASS, Fleet ops stays FFmpeg (protect live).

---

## 2) Redaction — what we use · why it looks like shit

### What we are using **now**

| Layer | Tech |
|-------|------|
| Detector | **OpenCV YuNet** ONNX (`redaction-track/models/face_detection_yunet.onnx`) |
| Runtime | Python sidecar `redaction-track/detect_faces.py` |
| Auto preview | Sample frames → **tight** boxes (`buildTightSampleRegions`) |
| Save after Auto | **`burn` mode:** per-frame YuNet + IoU hold + Gaussian ROI blur → ffmpeg **mux audio only** |
| Save without Auto | Old **static FFmpeg boxes** (union path — known “blur everything”) |

This is **not** Seeta / InsightFace / FaceShield for redact. Those are FR or research refs only.

### Why “redacts everything”

Operator report matches a **quality FAIL**, not a mystery:

1. **YuNet false positives** on BWC (helmets, screens, hands, glare) → many boxes every frame → burn blurs all of them → scene looks destroyed.  
2. **Auto is only as good as the detector.** If Auto paints the whole scene, face-follow burn will too — it follows **every** “face” hit.  
3. If Save was done **without** Auto face-follow (`faceFollow: false`) → still the **old static FFmpeg** path (already known FAIL).  
4. Auto’s job is **suggest faces for review** — not “blur the planet.” If suggest is garbage, Auto has **no product value** until detector/thresholds improve.

### Why have Auto face at all?

| Intent | Reality now |
|--------|-------------|
| Suggest faces → human review → burn only faces | **Broken if YuNet floods trash boxes** |
| Faster than drawing every face by hand | Only useful when suggestions are **tight and few** |
| Ship story: privacy redact | **Not ship-ready** while “blur everything” |

So: we need Auto for the ship story **only after** suggest/burn is face-sized. Today’s result = **FAIL / not demoable**.

---

## 3) Next redact work (paper — needs MOB-APPLY when you say)

Not inventing code tonight. When you APPLY one named MOB:

**`mob-evidence-redact-yunet-quality-v1`** (suggested)

- Raise score / stricter size / fewer false hits  
- Cap max faces per frame  
- Preview must look face-only before Save  
- Prove one BWC clip: blur moves on face, background readable  

Until that PASS: do **not** claim enterprise redact done; manual-only may be less bad than Auto on some clips.

---

## One line

**ZLM again when startPlay + `wvp-zlm primary` (G2–G3) — then wire ops without invite hold. Redact = YuNet OpenCV face-follow; Auto worthless while it paints everything — quality MOB next, not more hope.**
