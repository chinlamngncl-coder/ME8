# MOB DISC — Next MOB after FLV-vs-ffmpeg clarity (ANPR live)

**Date:** 2026-08-03  
**Status:** DISCUSSION ONLY — one recommended APPLY  
**You understood:** live watch = FLV; ffmpeg = still-grab for AI. Good.  
**Problem left:** ANPR watch → ffmpeg snaps ~4×/s + YOLO + OCR → CPU fight → tile jerks; SUV mush on rail.

**Prior:** `MOB-DISC-ANPR-SLOW-CROP-FLV-JERK-SUV-FAIL-20260803.md`, `MOB-DISC-FLV-LIVE-VS-FFMPEG-STILL-GRAB-20260803.md`

---

## Suggestion (one path)

### `ANPR-LIVE-CPU-BUDGET-SHARP-EMIT-V1`

**Why this MOB (not chase / not more OCR):**  
Live FLV player is already the right base. Soft-chase stays. The pain is **job B** (ffmpeg stills + AI) starving **job A** (browser FLV), plus **publishing blurry SUV** frames.

| Do | Don’t |
|----|--------|
| Throttle / skip ffmpeg grabs while OCR busy | Re-tune mpegts chase again |
| Gate rail emit: no garbage mush (one Unclear or wait sharp) | Turn WVP handoff off |
| One card per SUV pass | Add HyperLPR / bigger model on live |
| Optional: ZLM snapshot API instead of ffmpeg demux if available | Touch pin Firmware Gold |

**PASS (you):** ANPR watch on → tile usable; fast SUV → one good plate **or** one Unclear (not UNCLEAR + 11WM4); sharp plates still ~1–2 s.

---

## Not this MOB (different queue)

| Item | When |
|------|------|
| `PACK-AXIOM-ZIP-OPEN-PROOF-V1` | Partner zip / Windows Extract All — **separate** from ANPR live |
| Chase / FLV player rewrite | Only if Stop-watch still jerks with ANPR **off** |

---

## Operator next

Say:

**`MOB-APPLY ANPR-LIVE-CPU-BUDGET-SHARP-EMIT-V1`**

Until then: no code.
