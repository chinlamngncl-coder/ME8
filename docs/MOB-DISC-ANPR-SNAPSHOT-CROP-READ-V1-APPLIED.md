# MOB DISC — ANPR-SNAPSHOT-CROP-READ-V1 APPLIED

**Date:** 2026-07-29  
**Status:** **APPLIED** — **operator OCR FAIL** 2026-07-29 (shell UI only; not ship-quality read)  
**FAIL evidence:** crop **AAJ 8008** → card **AAJ 80584** @ 67% — `MOB-DISC-ANPR-OCR-FAIL-FR-STYLE-LIVE-VIDEO-CROP-MATCH-20260729.md`  
**APPLY:** go ahead / `ANPR-SNAPSHOT-CROP-READ-V1`  
**Parent plan:** `MOB-DISC-ANPR-PRODUCT-LIVE-SNAPSHOT-LISTS-20260729.md`

---

## Scope shipped

| Piece | What |
|-------|------|
| UI | Analytics → **ANPR**: upload photo → **Crop** → **Read plate** → result card (crop thumb · plate · confidence) |
| Crop | `public/js/anpr-plate-cropper.js` — wide freeform frame (vanilla canvas) |
| API | `GET /api/analytics/anpr/health`, `POST /api/analytics/anpr/read` |
| Engine | Node `tesseract.js` via `lib/anprPlateRead.js` (operator-cropped still; no live YOLO yet) |
| License | `analyticsAnpr` / `anpr` |
| Style | `global.css` ANPR block; hub chrome unchanged |

## Out of scope (later MOBs)

- Plate lists (Blacklist / Wanted / Suspicious)
- Live ZLM worker
- Colour / vehicle fields
- Manuals

## Operator check

1. Restart ME8 server; hard-refresh Analytics.  
2. License must have **ANPR** enabled (tab enabled).  
3. Open **Analytics** → **ANPR**.  
4. Upload a clear plate photo → crop onto the plate → **Read plate**.  
5. **PASS** if plate text + confidence appear on the result card (low-confidence warning OK on hard photos).

## Next MOB (default)

`ANPR-PLATE-LISTS-V1`

## Locked pack / notice reminder (do not drop)

See **`docs/MOB-DISC-ANALYTICS-PACK-LIKE-FR-AND-PUBLIC-NOTICE-AFTER-WEAPONS-20260729.md`**:

- ANPR (and later Weapon) engines/nodes/data must **ship packed like FR** — not lab-only / first-run download.
- **Public notice** for Analytics modules: remind **after weapons PASS** (`ANALYTICS-PUBLIC-NOTICE-V1`).
- Suggested later: `ANPR-SHIP-PACK-PARITY-V1` before customer ANPR ship.
