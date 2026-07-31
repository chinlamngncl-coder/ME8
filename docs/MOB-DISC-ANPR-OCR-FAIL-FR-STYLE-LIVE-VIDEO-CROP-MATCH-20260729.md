# MOB DISC — ANPR OCR FAIL + FR-style live / video upload → crop → match

**Date:** 2026-07-29  
**Status:** **LOCKED recommendation** (paper only — no code until named APPLY)  
**Search:** ANPR bad OCR, AAJ 8008, FR style live offline video crop match, plate lists  
**Evidence:** Operator screenshot — crop shows **AAJ 8008** (NCR), result card **AAJ 80584** @ 67%  
**Depends on:**  
- `MOB-DISC-ANPR-SNAPSHOT-CROP-READ-V1-APPLIED.md` (starter UI — FAIL quality)  
- `MOB-DISC-ANPR-PRODUCT-LIVE-SNAPSHOT-LISTS-20260729.md`  
- `MOB-DISC-ANPR-ZLM-WORKER-STREAM-FANOUT-20260729.md`  
- `MOB-DISC-ANALYTICS-PACK-LIKE-FR-AND-PUBLIC-NOTICE-AFTER-WEAPONS-20260729.md`  
- FR patterns: Face live tiles · **Load video (offline)** · Watchlist match  

---

## Plain English

1. **Agree — current plate read is unacceptable** for ops. Clear crop of **AAJ 8008** must not become **AAJ 80584**. Snapshot V1 with plain `tesseract.js` is a **lab shell**, not a ship engine.  
2. **Yes — ANPR should follow FR-style workloads:** live video **and** video upload, operator (or auto) crop, then **read + match** (plate lists), same Analytics family as Face / Verify / Watchlist.  
3. Fix order: harden **engine + match**, then add **live + offline video** surfaces — do not only add more UI on a bad OCR.

---

## Evidence (this FAIL)

| Item | Value |
|------|--------|
| Crop (human) | **AAJ 8008** (+ region mark NCR) |
| Card output | **AAJ 80584** |
| Confidence | **67%** (not low enough to block a wrong string) |
| Root class | Weak OCR / no plate-tuned engine; digit confusion (00→0584-style garbage); no list confirm; no second-pass |

**Operator PASS rule for any later ANPR read MOB:** on this class of clear plate crop, displayed plate must match human read (allow space/dash normalize only). Wrong digits = **FAIL**.

---

## FR workloads → ANPR mirror (yes)

| FR today (Analytics) | ANPR should be |
|----------------------|----------------|
| **Face recognition** live tiles (BWC / ZLM play) | **Live ANPR** — sample ZLM/FLV (not second BWC invite) |
| **Load video (offline)** file → face probe | **Load video (offline)** → frame pick / auto plate boxes → crop → read |
| Snapshot / enroll crop → Watchlist | Snapshot / freeze crop → **Plate lists** match |
| Verify 1:1 still photos | Keep **Snapshot** upload + crop (already started) |
| Hits / Known subjects | **Hits** when list match (Blacklist / Wanted / Suspicious) |

Same hub chrome. Same “operator is not tech” language. Same pack-like-FR rule for models/nodes.

---

## Why results are bad (not “crop UI alone”)

| Factor | Effect |
|--------|--------|
| Generic Tesseract on still crop | Not plate-specialized; invents digits; PH/NCR plates not tuned |
| No detector before OCR | Relies 100% on operator crop; still OCR can hallucinate inside the box |
| Confidence 67% still shown as success | Should warn harder / require confirm when below threshold or checksum fail |
| No plate-list match yet | Nothing to say “not on list” vs “wanted hit” — read quality is the whole story |
| No multi-frame vote | Live/video would let us vote best of N frames (FR-like) |

**UI crop is still required** (FR enroll crop taught that). **Engine upgrade is required** for PASS. Video alone will not fix AAJ 8008 → 80584 if the same OCR runs on one freeze.

---

## Product recommendation (one path)

### A) Three intakes (same engine, same lists) — FR style

| Mode | Operator action | Backend |
|------|-----------------|--------|
| **Snapshot** | Upload photo → crop → Read plate | Already started; keep after engine upgrade |
| **Live** | Select BWC(s) / watch on Analytics → ANPR | Worker on ZLM play URL; low FPS; emit hits |
| **Offline video** | **Load video** (like FR) → scrub / auto-suggest plate boxes → crop or accept → read → match | Decode locally/server; no second camera invite |

All three call: **detect (optional) → crop → OCR → normalize → Plate lists match → result / hit card**.

### B) Match (lists) — required for “FR style”

Without lists, ANPR is only a notepad. After a usable read:

- Match **Blacklist / Wanted / Suspicious** (and show badge)  
- No hit → plain “No list match”  
- Face Watchlist stays faces-only  

### C) Engine (must before celebrating video UI)

| Step | Direction |
|------|-----------|
| Plate detector | YOLO (or equal) plate weights — suggest box on still **and** video frames |
| OCR | Plate-oriented stack (e.g. PaddleOCR / regional), **not** raw Tesseract as ship default |
| Post | Char whitelist, length heuristics, multi-frame vote on live/offline |
| Pack | Models + START path **like FR** (`MOB-DISC-ANALYTICS-PACK-LIKE-FR-…`) |
| Threshold | Wrong read at mid confidence → show **confirm / edit** or hard “Low confidence” before treat as hit |

---

## Suggested MOB order (revised after this FAIL)

| # | MOB | Why |
|---|-----|-----|
| 1 | `ANPR-ENGINE-PLATE-OCR-V1` | Replace/augment tesseract path; PASS on AAJ 8008-class crops |
| 2 | `ANPR-PLATE-LISTS-V1` | Blacklist / Wanted / Suspicious + match on read |
| 3 | `ANPR-OFFLINE-VIDEO-CROP-V1` | FR-style **Load video** → frame/crop → read → match |
| 4 | `ANPR-LIVE-ZLM-WORKER-V1` | Live sample from play URL; hits into UI |
| 5 | `ANPR-SHIP-PACK-PARITY-V1` | Models/tessdata/sidecar in customer zip like FR |
| 6 | Manuals / public notice | After weapons + analytics freeze (existing discs) |

**Agent pick:** **Engine first**, then lists, then offline video, then live.  
Do **not** add live/offline UI on top of the current OCR and call it PASS.

Snapshot UI from V1 **stays** as one intake — re-test after engine MOB.

---

## Arguments / watch-outs

| Risk | Mitigation |
|------|------------|
| More video UI, same wrong OCR | Engine MOB gated by AAJ 8008 (and similar) PASS |
| Live melts CPU | Cap cams + FPS; ZLM fan-out only |
| Offline long files | Sample FPS / operator scrub; same as FR offline discipline |
| Pack bloat | Pack like FR; air-gap models; no CDN first-open |
| Operator edits wrong plate on Wanted | Confirm step on low confidence / list hit |

---

## Operator decide

If you agree:

1. Say **go ahead** / `MOB-APPLY ANPR-ENGINE-PLATE-OCR-V1` (fix the bad read first), **or**  
2. Override order (e.g. lists first) by naming that MOB.

No code until that APPLY.

---

## Lock record

| Item | Decision |
|------|----------|
| Current OCR quality (AAJ 8008 → 80584) | **FAIL** — not ship |
| FR-style live + offline video + crop + match? | **Yes** |
| Snapshot upload + crop? | **Keep** (after engine upgrade) |
| Plate lists match? | **Yes** — required for FR-like workload |
| First next software MOB (default) | `ANPR-ENGINE-PLATE-OCR-V1` |
| Code in this disc | **None** |
