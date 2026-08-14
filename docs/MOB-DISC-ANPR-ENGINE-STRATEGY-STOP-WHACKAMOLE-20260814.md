# MOB-DISC ANPR engine strategy — stop whack-a-mole — 2026-08-14

**Status:** planning + applied hotfix noted below.  
**Audience:** product (operator not tech).  
**Trigger:** Snapshot never stable (fix A breaks B); badge “Not available” while lists sometimes match; fear of Offline Video; FR/Weapon risk.

---

## Hotfix just applied (small)

**`MOB-APPLY ANPR-ENGINE-RAPIDOCR-ROUTE-CASCADE-V1`** (typo `OB-APPLY` accepted)

- `START-ANPR.bat` sets `FM_ANPR_ENGINE=rapidocr`.
- `/read` only used the good cascade for `fastalpr` — **`rapidocr` fell into dead Paddle path** → endless “No plate found”.
- **Fix:** route `rapidocr` / `rapidocr-onnx` / `dual*` through the same cascade; health `ok` / `ocr: ready` based on Stage-2 + RapidOCR (not FastALPR).

**You must restart `START-ANPR.bat` then hard-refresh before judging Snapshot again.**

This hotfix does **not** finish Offline Video. It only unblocks the env mismatch that made Snapshot look randomly cursed.

---

## Why it felt “1 works, 2 dies”

Not one mystery bug — **too many overlapping stacks in one process**:

| Layer | What we stacked | Failure mode |
|-------|-----------------|--------------|
| Env | bat=`rapidocr`, code gate=`fastalpr` | Cascade never runs |
| OCR | RapidOCR merge-all-lines | Bumper + plate → format reject |
| Detect | Vehicle-required, then plate YOLO | Tight Snapshot crop → no car → no plate |
| Health | Badge wants `ocr==='ready'` / FastALPR | Engine “Not available” while process is up |
| Live | Native VideoCapture (now removed) | Poller vs static fighting attention |

Plate lists showing a **correct** `NDC5447` Suspicious hit only proves **list storage works** — not that the last Snapshot OCR succeeded.

**Rule going forward:** one static pipeline, one OCR reader, one health truth. No more parallel “hatch” engines unless isolated behind a named APPLY.

---

## Does PyTorch ANPR harm FR / Weapon?

**Same process = yes, risk. Separate process = no (safe pattern).**

| Risk | If ANPR shares FR/Weapon Python | If ANPR stays its own `:8768` venv/process |
|------|----------------------------------|-------------------------------------------|
| CUDA / VRAM fight | High | Low (OS separates; still watch total VRAM) |
| `torch` / DLL / OpenMP deadlock | High (we already hit RapidOCR↔OpenCV thread issues) | Contained to ANPR bat |
| Import paddle / shm.dll | High | Contained |
| Crash one analytics engine | Can take siblings | Only ANPR dies |

**Locked product rule (recommend):**

1. **FR** = its own sidecar process.  
2. **Weapon** = its own sidecar process.  
3. **ANPR** = its own sidecar process (`anpr-sidecar` / `START-ANPR.bat`).  
4. **Never** `pip install` FR/Weapon/ANPR into one shared global Python.  
5. Prefer **ONNX Runtime** for ANPR OCR (CPU/DirectML) so ANPR does not need a second big PyTorch CUDA stack — Stage-2 YOLO `.pt` is the only torch load; long-term export Stage-2 to ONNX too.

PyTorch itself is not “evil.” **Sharing one GPU process with FR/Weapon is.**

---

## Web research — what is actually stronger (2025–2026)

Sources reviewed: [fast-alpr](https://github.com/ankandrew/fast-alpr), [fast-plate-ocr](https://github.com/ankandrew/fast-plate-ocr) CCT v2 global models, Nomeroff Net, PlateScanner (YOLO+ONNX OCR), academic YOLOv8+Paddle/EasyOCR SE Asia papers, PH parking ALPR (YOLOv5 + commercial ALPR API).

### Industry pattern that wins

**Detector (YOLO/ONNX plate box) → plate-trained OCR (not generic document OCR) → country regex.**

Generic PP-OCRv4 / EasyOCR / Tesseract on whole scenes is **weaker** for plates than plate-specific CTC/CCT models. Detection quality dominates OCR accuracy (multiple 2025 papers).

### Stronger than our current RapidOCR generic reader

| Option | Strength | Fit for ME8 | FR/Weapon risk |
|--------|----------|-------------|----------------|
| **A. FastALPR + fast-plate-ocr CCT v2 global** (ONNX) | Purpose-built plate OCR; ONNX; modular; actively maintained | **Best next ship path** for Snapshot + Offline frames | Low if own process; ONNX OCR avoids extra torch |
| **B. Keep PH Stage-2 YOLO + swap OCR only to fast-plate-ocr** | Keeps your PH plate det weights; fixes weak reader | **Best low-risk upgrade** (one OCR swap) | Same as today if process-isolated |
| **C. Nomeroff Net** | Full ALPR framework | Heavy; EU-centric; more deps | Higher if torch-heavy in same box |
| **D. HyperLPR3** | CN-oriented legacy | Already optional Engine B; not PH-first | Extra deps |
| **E. Commercial ALPR API** | Accuracy / support | Offline air-gap / license cost; data leaves box | N/A (network) |

**Recommendation (one path):**  
**Do not keep patching RapidOCR forever.** After Snapshot PASS on the hotfix, next genre = **`ANPR-FAST-PLATE-OCR-SWAP-V1`**: keep Stage-2 `ph_id` detect + 30% pad; replace RapidOCR with **fast-plate-ocr `cct-s-v2-global-model` (or xs)** via ONNX in the **same anpr-sidecar process**. Keep LTO PH regex. Kill dead Paddle path code later (cleanup MOB).

Offline Video later = same OCR on sampled frames / keyframes — **not** a third engine.

---

## Offline Video (why you should wait)

Offline video needs: decode → sample → detect → OCR → dedupe → rail/history.  
If Snapshot still lies, Offline Video will burn hours and look worse.  
**Gate:** Snapshot PASS on 5 tight crops + 5 full rear shots → then Offline Video MOB.

---

## What to forget / park

- Live native VideoCapture (already removed) — stay removed until a single static stack is green.  
- Dual HyperLPR “heavy” as default — optional hatch only.  
- PaddleOCR in ANPR process — park (DLL history).  
- Whack-a-mole format gates without fixing the reader — stop.

---

## Operator next step (today)

1. Restart **`START-ANPR.bat`**.  
2. Hard-refresh dashboard.  
3. Badge should move toward **OK** when Stage-2 + RapidOCR load.  
4. Snapshot `NDC 5447` / `NBO 7026` again.  
5. Tell PASS/FAIL.  
6. Only then discuss **`ANPR-FAST-PLATE-OCR-SWAP-V1`** (stronger OCR) — **not** Offline Video yet.

---

## Named future APPLYs (do not run until ordered)

| Name | Purpose |
|------|---------|
| `ANPR-FAST-PLATE-OCR-SWAP-V1` | Replace RapidOCR with fast-plate-ocr CCT ONNX; keep PH YOLO |
| `ANPR-STAGE2-ONNX-EXPORT-V1` | Drop torch from Stage-2 if VRAM fights FR/Weapon |
| `ANPR-OFFLINE-VIDEO-V1` | After Snapshot PASS only |
| `ANPR-HEALTH-BADGE-UI-V1` | If badge still wrong after sidecar `ocr:ready` (Node/UI only) |
