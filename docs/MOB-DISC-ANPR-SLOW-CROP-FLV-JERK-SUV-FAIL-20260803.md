# MOB DISC — Cropping slow · live jerks again · SUV failed (2026-08-03)

**Status:** DISCUSSION ONLY — no code until `MOB-APPLY …`  
**Evidence:** Recent Plates rail (same session) — sharp cards (NDO 7006 / NCB 1978 / NDC…) vs white SUV **UNCLEAR** + **11WM4** on motion-smear micros  
**Related APPLIED:** `ANPR-BEST-PLATE-CROP-TRACK-V1`, `ANPR-OCR-CCT-S-GLOBAL-V1`, `GLOBAL-FLV-LAB-CHASE-UNIFY-V1`  
**Related prior disc:** `MOB-DISC-ANPR-LIVE-30S-LAG-NO-CROP-20260802.md` (same class: AI load ≠ ZLM “broken again”)

---

## Straight answers

### 1) Didn’t we already solve live jerk?

**Partly — different layer.**

| Layer | Status | What it fixes |
|-------|--------|----------------|
| Browser FLV soft-chase (`AxiomFlvManager` 1.5s / 1.12x) | **APPLIED** | Player buffer creep when the **machine is healthy** |
| ZLM/WVP handoff | **PASS** (prior) | Upstream path — do **not** re-open `liveBufferLatencyChasing` |
| ANPR watch load on same PC | **Still hot** | Extra FLV decode + YOLO every ~250 ms + pose/OCR on flush |

So: chase math is still in place. When ANPR Live is watching, the **same machine** fights for CPU/disk/network. The tile can look **jerky / stuttery** again even though chase code did not regress. That is **contention**, not “chase was deleted.”

**How to prove which layer (you):**  
- Stop ANPR watch (Stop all) — if tile smooths → **ANPR CPU / grab load**.  
- Keep watch on but if tile is smooth and only **rail** is late → **OCR/harvest lag**, not player.

---

### 2) Why does cropping still feel slow?

Best-plate MOB **did not** make Stage-1 lighter. It only ranked micros before OCR and skipped enhance when already sharp.

**Live cost today (still pays every watch):**

1. **Producer ~4 FPS** (`FM_ANPR_GRAB_MS` ≈ 250) → `ffmpeg` **JPEG grab from the same ZLM FLV** the browser is already playing (`frLiveProbe.grabJpegFromFlv`) — **second decode per cam**.  
2. **Consumer** → `/track` → vehicle YOLO + stabilize + macro JPEG encode (every newest frame).  
3. **Track exit (~1 s age)** → `/read-macro` → CCPD pose warp/crop + **cct-s** OCR (heavier than old `cct-xs`) + temporal vote / rank.

What improved: fewer useless OCR calls when crop is **not** a new best; skip Lanczos when fm ≥ 80.  
What did **not** improve: grab+YOLO cadence, pose on flush, cct-s weight, dual FLV decode.

Operator feel: “cropping slow” = time until a **usable micro** hits the rail, not CSS paint.

---

### 3) Why did the white SUV fail?

From your rail (middle row):

| Card | Plate crop | OCR |
|------|------------|-----|
| 05:00:10 | Heavy **motion smear** | **UNCLEAR** |
| 05:00:06 | Same class of smear | **11WM4** (garbage) |

This is **not** mainly “pad still too loose.” The micro is a **blurred plate patch**. Best-plate rank cannot invent a sharp frame that was never kept. Force-flush / short track age (`MAX_AGE_MS` default **1 s**) + moving BWC/SUV can flush **only mush**, then:

- blur gate → UNCLEAR, or  
- OCR still runs on soft mush → hallucination (11WM4), and  
- emit block allows a **second** card for the same pass (two SUV cards seconds apart).

Sharp cars in the same grid (NDO / NCB) prove the stack can win when the track had a readable keyframe.

**NDC 5447** (crop shows …54472, text drops last digit) is a separate **OCR truncate / vote** issue — not the SUV motion-blur fail.

---

## One picture (why jerk + slow crop travel together)

```text
BWC → ZLM FLV ──┬── browser tile (mpegts + soft-chase)
                └── ffmpeg snap every ~250ms → YOLO track → (flush) CCPD + cct-s
                         ↑
                   same PC CPU / decode budget
```

When the right branch is busy: tile stutters, chase fights a starved main thread, and rail crops arrive late or from the wrong (blurry) macro.

---

## What we must not do

- Blame WVP handoff / turn handoff off  
- Re-enable `mpegts` hard `liveBufferLatencyChasing` / stash-off  
- Touch Firmware Gold pin mirror / DeviceControl  
- Stack another OCR engine “to fix SUV”  
- Pretend Best-Plate MOB alone was the latency fix

---

## Risk pick (one next MOB)

| Option | Verdict |
|--------|---------|
| **A. Live CPU budget + sharp-emit gate** — slow grab when `aiBusy`; prefer ZLM snap API if available (avoid ffmpeg FLV every tick); **do not publish** force-flush when best plate score / micro fm below floor (keep waiting or one Unclear max); keep chase untouched | **RECOMMENDED** |
| B. Only lower GRAB to 1 FPS | Helps CPU; may miss short SUV pass — incomplete alone |
| C. Re-tune FLV chase numbers again | **Reject** until Stop-watch test proves player-only lag |
| D. Bigger OCR model / more engines | **Reject** — worsens jerk |

### Recommended name: `ANPR-LIVE-CPU-BUDGET-SHARP-EMIT-V1`

**Scope (poller + sidecar emit rules; no player rewrite):**

1. **Prove load:** log grab-ms + track-ms + read-macro-ms; if grab > budget, skip that tick (drop-oldest already).  
2. **Budget:** when harvest OCR running, **skip or stretch** producer (e.g. 2 FPS while busy) — live FLV first.  
3. **Sharp emit:** force-flush must not rail-publish OCR garbage if micro fm / cropRank score below floor — one Unclear or wait for better keyframe (cap wait ~2–3 s).  
4. **Same-SUV spam:** strengthen track emit block so one pass ≠ two mush cards.  
5. **Optional hatch:** ZLM HTTP snapshot instead of ffmpeg FLV pull (if lab ZLM exposes it) — cut second full demux.  
6. **No** chase / pin / HyperLPR-on-live revive.

**PASS (you):**

1. ANPR watch ON — tile stays usable (not jerky like tonight).  
2. White SUV / fast pass — either **one** readable plate card, or **one** Unclear — not UNCLEAR + 11WM4 pair.  
3. Sharp plates (NDO/NCB class) still appear within ~1–2 s of leave.  
4. Stop watch → tile remains smooth (sanity).

---

## Operator next

Say exactly:

**`MOB-APPLY ANPR-LIVE-CPU-BUDGET-SHARP-EMIT-V1`**

Until then: **no code** — this disc only.
