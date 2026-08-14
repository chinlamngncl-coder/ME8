# MOB-DISC ANPR stuck on red car NHC4477 while live shows 20A 26 (2026-08-13)

## Operator truth (screenshot + bat)

- Live tile: black Camry, plate **20A 26** clear; Recent Plates stuck on red car **NHC4477**.
- Watch/start path is **working** (ingest PASS). Not “engine down.”
- Log loop every tick: `vehicles=3` → three Stage-2 crops → RapidOCR:
  - Large ~`(140×463)` → **`ENHC4477` / `ENHC44777` conf ~0.98** (emit / UI card)
  - Mid ~`(79×284)` mean≈237 → **empty** → silent drop
  - Small ~`(41×94)` → **empty** → silent drop
- So the pipeline is **not frozen**. It **keeps succeeding only on the red plate**. Camry never publishes → UI looks “stuck forever.”

## Why the whole-day round-and-round

| Past fights | Status now |
|-------------|------------|
| Paddle / OCR engine | RapidOCR running |
| No `/watch/start` | Fixed (events + start happening) |
| Square crop | Aspect gate exists |
| **This** | Multi-vehicle: distant/easy plate wins; foreground Camry OCR empty |

Fixing engines/ingest again will **not** clear “stuck on red.” Different bug class.

## Root cause (one sentence)

**Live OCR loops all Stage-1 vehicles; only the red car’s crop returns text, so Recent Plates only ever shows NHC4477 while the Camry crop is silent-dropped.**

Secondary:

- Leading **`E`** on `ENHC4477` = OCR junk prefix (true plate likely **NHC4477**).
- Washed mid crop (`mean≈237`) and tiny `(41×94)` should not burn OCR / hope.
- Browser **pause** does not pause Python `VideoCapture` — OpenCV still reads the FLV.

## Forbidden (cheat / harm)

- Hardcode one plate / one cam / one FLV
- WVP `ensurePlay` from ANPR
- “Just raise conf” so red never emits (hides Camry miss)
- Another full OCR engine swap this turn

## Risk pick — one next APPLY

**Recommended:** `ANPR-LIVE-OCR-LARGEST-VEHICLE-ONLY-V1`

Live / native path: per frame, OCR **only the largest Stage-1 vehicle** (area = nearest/foreground bias on BWC).

- Stops distant red from monopolizing Recent Plates while Camry fills the tile.
- Multi-BWC unchanged (still per camId).
- If Camry still empty after that → **next** MOB = S2 quality on that single crop (washed/tiny reject + PH prefix strip) — one problem at a time.

**Not first:** reorder-all-still-OCR-three (red still wins).  
**Not first:** engine swap again.

## Operator PASS after APPLY

1. Same scene: Camry large in frame → bat shows **one** OCR path on the large macro (not three).
2. Recent Plates either updates toward **20A26** / Camry, or empty + clear silent-drop on **that** crop (honest fail → next MOB).
3. Red-only sticky card without Camry attempt = FAIL.

## Next step

`MOB-APPLY ANPR-LIVE-OCR-LARGEST-VEHICLE-ONLY-V1`
