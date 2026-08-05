# MOB DISC — Live ~30s lag + no snap/crop (2026-08-02)

**Status:** DISCUSS ONLY — wait for `MOB-APPLY …`  
**Operator:** Live video feels ~30s late again; **no snapping / cropping**. Angry — same class of mistake as prior lag fights.

---

## Plain English (what went wrong)

You already paid for a **zero-latency** pass (`ANPR-ZERO-LATENCY-DROP-TRACK-FLUSH-V1`: drop-oldest queues, 1s track flush, 1 macro OCR).  

Then tonight’s stack added **heavy work on every plate path**:

1. **CCPD YOLOv8m-pose ONNX** (~101 MB) — Stage 3 warp  
2. **Engine B = HyperLPR3** (full detect+rec) **plus** FastALPR every time  
3. **Micro Laplacian gate `fm < 100`** — discard crop before OCR  

That recreates the old failure mode: **OCR/harvest takes many seconds**, rail feels “live but 30s behind,” and if every micro fails the blur gate or HyperLPR/PH regex, **you see zero snaps and zero crops**.

This is **not** “mysterious ZLM again.” ZLM/WVP latency was already **PASS** (`MOB-DISC-ZLM-WVP-LATENCY-PASS-20260729`). Do **not** turn on `liveBufferLatencyChasing` / stash-off (that caused minutes lag before).

---

## Two symptoms → two causes (same MOB)

| What you see | Most likely cause |
|--------------|-------------------|
| Live feels ~30s late (ANPR / snaps) | Harvest OCR blocked on **slow dual** (pose + FastALPR + HyperLPR). Drop-oldest still drops frames, but **published ticks** are wall-clock late. |
| No snap / no crop at all | **`micro_blur_reject` (floor 100)** killing micros, and/or HyperLPR CN text → PH regex empty → emit gate needs a plate string → **nothing on rail**. Pose weights missing would also kill Stage 3 (then WPOD hatch). |

If the **FLV tile itself** is 30s behind real life (person walks, tile shows past), say so on PASS — that is a **separate** player/ZLM check. Default assumption for this complaint after tonight’s APPLY: **ANPR processing lag + crop kill**, not mpegts chase.

---

## What we must not do

- Touch Frontend Gold / pin mirror / DeviceControl  
- “Fix” with `mpegts` `liveBufferLatencyChasing`  
- Add more engines / more gates before lag is gone  
- Leave HyperLPR mandatory on live while CPU is drowning  

---

## Risk pick (one recommendation)

| Option | Verdict |
|--------|---------|
| **A. Emergency restore live path** — Engine B back to **PP-OCRv4 hatch or FastALPR-only**; **micro blur floor → 20–40** (or off for live); keep CCPD pose | **RECOMMENDED now** — get snaps + crop back; kill 30s OCR pile-up |
| B. Keep HyperLPR; only lower blur floor | Incomplete — HyperLPR still slow + CN bias on PH |
| C. Re-tune ZLM/player buffers | **Reject** unless you confirm FLV tile (not rail) is late |

**Recommended MOB name:**

### `ANPR-LIVE-FAST-PATH-RESTORE-V1`

**Scope (sidecar + poller env only; no UI):**

1. Default Engine B **off HyperLPR for live** → `FM_ANPR_ENGINE_B=ppocrv4` **or** dual-off FastALPR-only (`FM_ANPR_DUAL_ENGINE` hatch) — pick **FastALPR + PP-OCR** as temporary dual (pre-HyperLPR), **or** FastALPR-only if PP-OCR also slow.  
2. `FM_ANPR_MICRO_BLUR_FLOOR` default **35** (not 100); log `micro_blur_reject` rate.  
3. Hard **OCR timeout** on `/read-macro` (e.g. 2.5s) — fail unclear, never hold harvest 30s.  
4. Health banner must say honest stack after restore.  
5. **No** pose geometry change. **No** HTML.

**PASS (you):**

1. Restart `START-ANPR.bat` + ME8.  
2. Live FLV moves with the room (not half a minute late).  
3. Vehicle past cam → **macro + micro crop** appear on rail within ~1–2s of leave.  
4. Blurry mush still skipped; readable plates still OCR.

---

## HyperLPR note (honest)

Google/prior disc already said HyperLPR3 is **CN-plate gold, not PH gold**. Mandating it as Engine B without a live CPU budget caused this regression. Park HyperLPR as **lab hatch**, not live default, until a light rec-only + timeout path exists.

---

## Operator next

Say exactly:

**`MOB-APPLY ANPR-LIVE-FAST-PATH-RESTORE-V1`**

Until then: **no code** — diagnosis only.
