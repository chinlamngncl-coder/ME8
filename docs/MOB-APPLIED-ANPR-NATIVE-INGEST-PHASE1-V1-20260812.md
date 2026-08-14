# MOB-APPLIED ANPR-NATIVE-INGEST-PHASE1-V1

**Date:** 2026-08-12  
**Status:** APPLIED  
**Architecture:** `ARCHITECTURE.md` RULE 1–2  

---

## What changed

| Layer | Behavior |
|-------|----------|
| **Node** | License gate + WVP FLV URL → `POST /watch/start`; poll `GET /watch/events`; **no ffmpeg grab** (default) |
| **Python** | `cv2.VideoCapture` loop; Stage 1 → Laplacian blur gate → OCR → 10s plate dedupe → events |
| **Hatch** | `FM_ANPR_NATIVE_INGEST=0` → old Node runtime grab |

### Filters (mandatory)

1. **Laplacian** on vehicle crop before OCR — discard if variance `<` `FM_ANPR_NATIVE_BLUR_MIN` (default **35**).  
2. **10s plate text dedupe** — exact compact string within window → silent discard.

### Files

- `anpr-sidecar/native_watch.py`  
- `anpr-sidecar/app.py` — `/watch/start|stop|status|events`  
- `lib/anprLivePoller.js` — native handshake control plane  
- `lib/anprSidecarClient.js` — watch* helpers  
- `START-ANPR.bat` — no longer auto-starts Node ingest  

---

## You do

1. Restart **Fleet**.  
2. Restart **`START-ANPR.bat`** only (Python).  
3. Hard refresh → Live ANPR on a **live** cam (WVP play so URL exists).  

**PASS:** server stays up; sharp plates appear; blurry/spam plates suppressed.

**Note:** If `cv2` cannot open your FLV URL, events show `watch-error` / `capture_open_failed` — report that; hatch `FM_ANPR_NATIVE_INGEST=0` only if needed.
