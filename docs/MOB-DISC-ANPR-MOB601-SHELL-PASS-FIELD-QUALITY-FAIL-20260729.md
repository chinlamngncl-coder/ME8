# MOB DISC — ANPR MOB-601 shell PASS, field quality still FAIL

**Date:** 2026-07-29  
**Status:** **LOCKED** — shell PASS · **accuracy FAIL** on real PH field photos  
**Search:** ANPR quality bad, WOO W00, HWZ 1539, UV Express, YOLO required, plate ROI  
**Operator:** “pass. but quality is still so bad. all wrong. only those that are huge and clear words are correct.”  
**Related:**  
- `MOB-DISC-ANPR-ENGINE-MOB601-V1-APPLIED.md`  
- `MOB-DISC-ANPR-MOB601-CONSOLIDATE-YOLO-PADDLE-20260729.md`  
- `MOB-DISC-ANPR-OCR-FAIL-FR-STYLE-LIVE-VIDEO-CROP-MATCH-20260729.md`

---

## Plain English

1. **MOB-601 shell = PASS** — sidecar runs, OpenCV + Paddle + regex + ≥80% floor, soft fail UI, no more “show garbage as success” from the old Tesseract path on clear lab synthetics.  
2. **Field accuracy = FAIL** — real PH photos still wrong or reject. Operator observation is correct: **huge clear words** (bumper slogans, stickers) win; **small plate characters** lose or get mixed in.  
3. Next work is **not more dashboard chrome** — it is **plate-first vision**: detect the plate box, OCR **only** that band, handle PH plate styles (including yellow PUV), then regex/floor.

---

## Evidence (this session)

### Case A — yellow PUV / UV EXP crop → format reject

| Item | Value |
|------|--------|
| Scene | Tight-ish rear crop; yellow plate; “TOUCH” trim; **NCR UV EXP** under number |
| Human plate (approx) | **W00 185** / **WOO 185** class (3+3) — PH public UV style |
| UI | Soft fail: *“No reliable plate read — the text did not match a valid plate format”* |
| What this proves | Floor/regex **working as gate**; OCR+compact string still not a clean `AAA`+`###(#)` after noise (O/0, PH badge, UV EXP, TOUCH) |

Soft fail here is **better than publishing wrong** — but ops still cannot use the module.

### Case B — night UV Express van → wrong plate @ 82%

| Item | Value |
|------|--------|
| Human plate | **WZT 539** (or same family — 3 letters + 3 digits) |
| System | **HWZ 1539** @ **82%** |
| Distractors | **DON'T TOUCH!**, huge **UV Express Service**, phone, route text |
| Why it escaped gates | Output still looks like legal PH `AAA####` and confidence **≥ 80%** — regex + floor cannot save a confident wrong plate |

This is the dangerous class: **wrong but “valid-looking.”**

---

## Root cause (consolidated)

| Cause | Effect |
|-------|--------|
| **OCR sees the whole crop / scene** | Bumper text and stickers are larger and sharper → Paddle prefers them or merges them with plate glyphs |
| **YOLO plate weights not in lab path** | Snapshot uses `skip_yolo`; no dedicated plate box → no “plate-only” ROI |
| **Generic EN PaddleOCR** | Not plate-tuned; weak on small/night/yellow PUV fonts; O/0 and digit invent |
| **PH style variety** | Private white, yellow PUV, center PH badge, NCR / UV EXP footer — regex alone cannot invent missing letters |
| **80% floor** | Stops low-conf garbage; does **not** stop high-conf wrong reads (Case B) |
| **Synthetic AAJ 8008 PASS** | Proved pipeline plumbing — **not** field readiness |

Operator line matches CV reality: **huge clear words correct; plate text wrong.**

---

## What MOB-601 already did right (keep)

| Rule | Keep? |
|------|-------|
| ZLM read-only (later live) | Yes |
| OpenCV gray + medianBlur before OCR | Yes (necessary, not sufficient) |
| Regional regex | Yes — reject illegal shapes |
| Soft fail UI (no wrong plate on format/low conf) | Yes |
| ≥80% floor | Yes as **minimum**; not enough alone |

---

## Recommended fix path (one path)

### Must: plate-first ROI (next engine MOB)

1. **Require plate detector** for any non-lab path (snapshot full-frame and loose crops): YOLO11 **plate** weights (or equal) → crop **plate rectangle only**.  
2. OCR **only** the plate ROI (after OpenCV clean) — never the bumper slogan band.  
3. If detector finds nothing → soft fail (“No plate found — tighten crop”) — do not OCR the whole photo.  
4. Pack weights + Paddle models like FR (`ANPR-SHIP-PACK-PARITY` still later).  
5. Windows: install ultralytics/torch only in a **verified** way (prior lab torch broke Paddle — isolate or CPU wheel that coexists).

### Should: PH plate OCR harden

| Item | Action |
|------|--------|
| Multi-style | Yellow PUV + white private in test set (operator FAIL cases A/B as regression) |
| Line pick | Prefer text line whose geometry is plate-shaped (wide short band), discard “UV EXPRESS” / phone lines |
| O/0 | Region post-rules carefully (do not blindly map all O→0) |
| Confirm on Wanted | Later lists MOB: Wanted hit needs operator confirm when score mid-band |

### Should not rely on

| Idea | Why |
|------|-----|
| Only raising floor to 90% | Case B at 82% wrong — higher floor helps some, still misses plate-vs-bumper |
| Only regex | Wrong `HWZ1539` is still regex-legal |
| More UI before detector | Repeats FAIL at scale |

---

## Suggested next MOB

| # | MOB | Outcome |
|---|-----|---------|
| 1 | `ANPR-PLATE-DETECT-ROI-V1` | Plate YOLO (or equal) required; OCR plate ROI only; soft fail if no plate; regression on Cases A/B |
| 2 | `ANPR-PH-OCR-HARDEN-V1` | Line ranking + PUV/yellow + night; PASS criteria on operator photo set |
| 3 | `ANPR-PLATE-LISTS-V1` | Lists only after reads are trustworthy enough |
| 4 | Offline video / live ZLM | Same engine after ROI PASS |
| 5 | Ship pack parity | Models in zip like FR |

**Agent pick:** **`ANPR-PLATE-DETECT-ROI-V1` next.** That is the direct answer to “only huge words are correct.”

---

## PASS / FAIL definitions (update)

| Layer | Status now | PASS means |
|-------|------------|------------|
| Shell (sidecar, gates, UI soft fail) | **PASS** (operator) | Pipeline usable |
| Field quality | **FAIL** | On operator set: plate text matches human (normalize spaces); bumper text must not become the plate; Case B class must not publish wrong `AAA####` |
| Ship | **Not ready** | Pack + field PASS |

---

## Operator decide

When ready to fix quality:

- Say **go ahead** / `MOB-APPLY ANPR-PLATE-DETECT-ROI-V1`

No code in this disc.

---

## Lock record

| Item | Decision |
|------|----------|
| MOB-601 shell | **PASS** |
| Field OCR quality | **FAIL** |
| Root story | Bumper/sticker text dominates; plate ROI missing |
| Next default MOB | `ANPR-PLATE-DETECT-ROI-V1` |
| Code | **None** until APPLY |
