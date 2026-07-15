# MOB DISC — FR 8-tile grid · 4 sets × 20s · resource truth

**Status:** DISC 2026-07-11 — **no APPLY**  
**Trigger:** BWC feeds are **low resolution** — 4 huge empty tiles waste space; proposal: **8 smaller boxes**, **4 sets of 8**, **20s per set** → 32 BWCs per full cycle  
**Search:** 8 tile, 4 sets, rotate 20s, CPU, GPU, RAM, bandwidth, FM_MAX_CONCURRENT_LIVE  
**Related:** `MOB-DISC-FR-LIVE-POLL.md`, `MOB-DISC-FR-BWC-CAPTURE-ENGINE-ORDER.md`, `MOB-DISC-FR-OPENALL-OVERLAP-OFFLINE-PIN.md`

---

## Proposal (your challenge)

| Parameter | Today (locked SOP) | Proposed |
|-----------|-------------------|----------|
| Visible tiles | **4** large (2×2) | **8** small (4×2 or 2×4) |
| Watch set | 32 BWCs | 32 BWCs (unchanged) |
| Rotation | Per-slot rotate every **20s** among 32 | **4 sets × 8 cams** — swap whole set every **20s** |
| Full cycle | Uneven (4 live + stagger) | **80s** — every BWC gets **20s on screen** |

**Math check:** 8 tiles × 4 sets = **32** ✓ · 4 × 20s = **80s** full roster ✓

---

## Verdict — is it doable?

| Layer | Doable? | Smooth today? |
|-------|---------|---------------|
| **UI layout (8 small tiles)** | **Yes** — CSS grid change only | **Yes** |
| **Set rotation (4×20s)** | **Yes** — cleaner than per-slot churn | **Yes** (video) |
| **8 concurrent live pool streams** | **Yes** on lab i7 — at **8 live cap** | **Tight** if Ops map/wall also live |
| **8 JSMpeg decodes in browser** | **Yes** — smaller canvases ≈ **less** fill than 4 upscaled blanks | **Yes** |
| **8-face probe per poll tick** | Code change required | **No** until grab + engine MOBs |
| **Production “smooth” end-to-end** | **Yes, after capture + primary engine genre** | **Not** on DeepFace path |

**We should not “just obey”** — 8 tiles is **right for BWC pixel size**, but **doubling live + probe load** without faster grab/embed will **stutter** the rail and alarms.

---

## Why 4 big boxes waste space (you're right)

Typical BWC live substream to C2:

| Attribute | Typical range |
|-----------|----------------|
| Resolution | **480×272 – 640×360** (often smaller than tile chrome) |
| Codec | H.264 / MPEG-4 Part 2 via SIP/RTP |
| Effective pixels | Small face box in frame — **letterboxing** in a large tile |

**4 oversized 2×2 cells** scale a small image into a big black-bordered region. **8 compact cells** match surveillance FR UIs (dense mosaic) and use dashboard area efficiently — same pattern as dense walls in Asian surveillance consoles (functional density, not cinematic 4-up).

---

## Resource model — 4 tiles vs 8 tiles

### A) Server — live stream pool (`liveStreamPool.js`)

One **ffmpeg** decode pipeline **per active cam** (shared WS fan-out to viewers).

| | 4 tiles | 8 tiles |
|--|---------|---------|
| Pool ffmpeg processes | **4** | **8** |
| RTP inbound (estimate) | 4 × 0.5–1.0 Mbps ≈ **2–4 Mbps** | 8 × 0.5–1.0 Mbps ≈ **4–8 Mbps** |
| CPU (decode, i7 class) | ~15–25% fleet slice | ~30–45% fleet slice |
| `FM_MAX_CONCURRENT_LIVE` | **4/8 used** | **8/8 used** — **full cap** |

**.env today:** `FM_MAX_CONCURRENT_LIVE=8` — **8 FR tiles alone exhaust the fleet SOP.**  
Ops map pin live, Open All, or SOS invite **compete** for the same 8 slots (`MOB-DISC-FR-OPENALL-OVERLAP-OFFLINE-PIN.md`).

**Mitigation (pick at APPLY):**

| Option | Trade-off |
|--------|-----------|
| **A** — FR watch owns 8; warn when Ops also live | Simple; operator discipline |
| **B** — Raise cap to **12–16** on FR-capable servers only | Needs installer doc + RAM |
| **C** — 8 tiles but **6 live + 2 snapshot** slots | Complex; probably not v1 |

**Recommendation:** **8 tiles + cap warning** in v1; **12 live** env for dedicated FR bench PCs only.

---

### B) Server — FR still grab (`frLiveProbe.js`) — **main bottleneck**

Each probe spawns a **second** ffmpeg + WS client per grab (`FM_FR_GRAB_MS` default **3500ms**).

| Per poll tick (~2s nominal) | 4 tiles | 8 tiles |
|-----------------------------|---------|---------|
| Cams probed (`FM_FR_LIVE_SLOTS`) | **4** | **8** |
| Grabs per cam (`BEST_FRAME_GRABS`) | 3 | 3 |
| Serial `represent-probe` (DeepFace) | 4 × 3 × **seconds** | 8 × 3 × **seconds** |
| Extra ffmpeg spawns per tick | up to **12** | up to **24** |

`frLivePoller.tick()` runs cams **serially** — with DeepFace, one tick can exceed **30s** for 4 cams already. **8 cams without grab-tune + primary engine = poll queue collapse.**

**This is why 8 tiles must follow (or parallel) capture + engine genre** — not precede it blindly.

---

### C) FR sidecar CPU (embed)

| | 4 active cams | 8 active cams |
|--|---------------|---------------|
| DeepFace `/represent-probe` / 2s | **Overload** | **2× overload** |
| Primary ONNX ~50ms/embed | ~0.6s/cam/tick | ~1.2s/cam/tick (serial) |
| Primary + **batch** 3-grab | ~0.2s/cam | ~0.4s/cam — **fits 2s poll** |

**GPU:** Today **CPU-only** (TensorFlow / future ONNX CPU). Optional NVIDIA improves primary path; **not required** for 8-tile if ONNX primary + batch.

---

### D) Browser — dispatcher workstation

| | 4 large JSMpeg canvases | 8 small JSMpeg canvases |
|--|-------------------------|-------------------------|
| Decode | 4 × mpeg1 WS (`disableGl: true` → **CPU**) | 8 × mpeg1 WS |
| Pixels drawn | 4 × large area (mostly black) | 8 × small — **often fewer total pixels** |
| RAM | ~4 players + canvases | ~8 players — **+~50–100 MB** typical |
| GPU | Minimal (no WebGL path) | Minimal |

**8 small tiles are not heavier than 4 big** for the same BWC bitrate — often **lighter** because canvas fill is smaller.

**Outbound WS to browser:** ~8 × 200–400 kbps mpeg1 ≈ **1.6–3.2 Mbps** — fine on LAN.

---

### E) RAM (server, rough)

| Component | 4 live | 8 live |
|-----------|--------|--------|
| Node + pool sessions | ~200–400 MB | ~350–600 MB |
| FR sidecar (DeepFace) | **1–2 GB** TF | same |
| FR sidecar (ONNX primary) | **300–800 MB** | same |

**16 GB RAM server** — 8 live + ONNX primary is comfortable. **8 live + DeepFace** — tight.

---

## Set rotation vs today’s per-slot rotate

| | Per-slot rotate (today) | **4 sets × 20s** (proposed) |
|--|-------------------------|----------------------------|
| Operator mental model | Confusing (who is live when?) | **Shift A / B / C / D** — clear |
| SIP churn | Frequent single-slot swaps | **One bulk swap** every 20s |
| Face coverage | 4 probed; others wait | **8 probed** per 20s block |
| 32-cam cycle | Irregular | **80s deterministic** |

**Set rotation is smoother for video** and matches your 32-BWC challenge.

---

## Locked recommendation

### Do the 8-tile challenge — **phased**, not big-bang

| Phase | MOB | Depends on |
|-------|-----|------------|
| **0** | `mob-fr-capture-grab-tune` + bench / primary sidecar | Capture/engine DISC |
| **1** | `mob-fr-8tile-grid-ui` | CSS 4×2 grid, smaller tiles, labels |
| **2** | `mob-fr-set-rotate-4x20` | Rotate **sets of 8** every 20s; `FM_FR_ROTATE_SETS=4` |
| **3** | `mob-fr-live-slots-8` | `FM_FR_LIVE_SLOTS=8`, poller cap raise `Math.min(8,…)` |
| **4** | `mob-fr-poller-batch-grab` + parallel cam probe | Smooth face on 8 |
| **5** | `mob-fr-live-cap-warn` | Toast when FR+Ops ≥ cap |

**Do NOT apply Phase 3–4 before Phase 0** — video may work; **face rail will lag**.

### Config sketch (after APPLY)

```env
FM_FR_LIVE_SLOTS=8
FM_FR_ROTATE_MODE=set          # set | slot (legacy)
FM_FR_ROTATE_SET_SIZE=8
FM_FR_ROTATE_SET_COUNT=4
FM_FR_ROTATE_MS=20000
FM_MAX_CONCURRENT_LIVE=8       # or 12 on FR bench server
```

---

## Comparison table (honest)

| Criterion | 4 big tiles | **8 small + 4 sets** |
|-----------|-------------|-------------------------|
| BWC small video fit | Poor | **Good** |
| 32-cam coverage clarity | Weak | **Strong** |
| Server pool load | 50% of cap | **100% of cap** |
| FR probe load | 1× | **2×** |
| Smooth without engine swap | Video OK, face marginal | Video OK, **face needs engine** |
| Ops + FR simultaneous | Room for 4 ops live | **No room** unless cap raised |
| Matches surveillance FR density | No | **Yes** |

---

## What we do NOT do

- ❌ 8 tiles + 8 live on DeepFace and claim production smooth  
- ❌ Change 32 watch cap or snapshot rail without DISC  
- ❌ Touch `video-wall.js`, PTT, SOS in this genre  
- ❌ GPU-mandatory ship requirement (CPU ONNX path first)  

---

## APPLY commands (when ready)

```text
MOB-APPLY mob-fr-capture-grab-tune          ← before 8-live face (parallel OK)
MOB-APPLY mob-fr-8tile-grid-ui              ← layout only; safe early
MOB-APPLY mob-fr-set-rotate-4x20            ← rotation logic
MOB-APPLY mob-fr-live-slots-8               ← after grab tune or with warning
```

**Suggested first step for your challenge:** `mob-fr-8tile-grid-ui` + `mob-fr-set-rotate-4x20` (video) while capture/engine genre runs — **checkpoint** before enabling 8-face poll.

---

## Bottom line

| Question | Answer |
|----------|--------|
| Is 8-tile + 4×20s doable? | **Yes** for layout and set rotation |
| Is it smooth **today** with face on DeepFace? | **No** — probe queue will choke |
| Is it smooth **after** fast grab + primary engine? | **Yes** on lab i7 / 16 GB — bench to confirm |
| Is 4 big tile wasteful for BWC? | **Yes** — 8 small is the right surveillance layout |
| Biggest risk? | **8/8 live cap** + **2× face probe** — not browser GPU |

Your challenge is **architecturally sound**. Sequence: **capture/engine hardening → 8-tile UI + set rotate → live-slots-8 + batch poller**.
