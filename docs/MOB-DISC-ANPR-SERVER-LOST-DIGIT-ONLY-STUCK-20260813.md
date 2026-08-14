# MOB-DISC ANPR: Server Lost + stuck ATA5667 / digit-only OCR (2026-08-13)

## Operator symptoms

1. **Server Lost** every few minutes  
2. Recent Plates empty or stuck on **first** plate (ATA5667)  
3. Live shows another car (e.g. NGM 4889) but UI never updates  

## What the log actually says

| Observation | Meaning |
|-------------|---------|
| `resized=…x80` + OCR returns | Resize/pad APPLY is live; sidecar not dead mid-OCR in these lines |
| `RAW OCR: ATA5667` then later `5667` / `5567` | Same plate; OCR often returns **digits only** |
| `silent drop pure_numeric … '5667'` | Our fleet-ID filter **kills the digit-only half** of a real plate |
| `皖ATA5667` / Chinese 皖 | RapidOCR = **Chinese PP-OCR** family — wrong for PH |
| `S2_accepted=0` while `OCR_sent` climbs | Funnel never “accepts”; emit only when full alnum slips through |
| `largest_only pick≈1.0M` every tick | Python keeps OCR’ing the **same huge** vehicle (ATA5667 car), not the smaller white car |
| `GET /health` 200 during OCR | ANPR process still answering — **Server Lost ≠ ANPR bat always down** |
| Final `Shutting down` | Process stopped (close bat / crash) — separate from digit drops |

## Three separate bugs (stop mixing them)

### A. Why Recent Plates “stuck on first car”

1. Once **ATA5667** emits → UI shows it.  
2. Next frames: RapidOCR often returns only **`5667`** (higher conf on digit line).  
3. Pure-numeric filter drops it → **no new emit**.  
4. 10s text dedupe also suppresses repeats of ATA5667.  
5. Live tile can show **NGM 4889** while OpenCV still crops the **largest** vehicle = still ATA5667 car (or stale large bbox). Smaller car never OCR’d (`largest_only`).

So: not “UI freeze” — **emit starvation** + **largest-only** + **digit-only OCR**.

### B. Why OCR returns 5667 instead of ATA5667

`rapid_ocr_engine.py` keeps **one** line: highest confidence. Digit block often wins → letters discarded → pure_numeric drop. That is the main plate-read bug right now.

### C. Why Server Lost every few minutes

Dashboard banner = **Fleet / socket** lost, not “OCR conf 0.” Heavy OCR (multi-second per frame) + service load can drop the dashboard socket while ANPR bat still prints. Fix OCR merge first; if Lost continues with light load → separate Fleet MOB.

## Forbidden

- Another OCR engine swap this turn  
- Turn off pure-numeric entirely (brings back taxi `1978`)  
- Hardcode plates / ensurePlay from ANPR  

## Risk pick — one next APPLY

**`ANPR-RAPID-OCR-MERGE-LINES-STRIP-CJK-V1`**

1. Merge **all** RapidOCR lines (L→R / top→bottom), not max-conf only.  
2. Strip CJK (e.g. 皖) and non-plate junk; keep Latin+digits.  
3. Then run existing publishable filter (≥5 alnum, not pure digits).  
   - `ATA`+`5667` → `ATA5667` → publish  
   - lone `5667` → still drop  

Optional follow-up (not this APPLY): OCR top-2 vehicles when largest yields pure_numeric / empty — so NGM can appear while ATA car still large.

## Operator PASS

1. Same ATA5667 scene → bat shows merged `ATA5667`, not endless `silent drop … 5667`.  
2. New car with clear plate → new Recent Plates card (after dedupe window).  
3. Server Lost: note if it still hits every ~few min after merge (then Fleet MOB).

## Next step

`MOB-APPLY ANPR-RAPID-OCR-MERGE-LINES-STRIP-CJK-V1`
