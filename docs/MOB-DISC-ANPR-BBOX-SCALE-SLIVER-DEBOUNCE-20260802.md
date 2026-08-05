# MOB-DISC — ANPR bbox scale, sliver reject, cascade, track debounce (2026-08-02)

## Mandate

CRITICAL BACKEND: cascaded cropping, bounding-box scaling & debounce.  
Scope: Python sidecar (`dual_lpr.py` / `wpod_net.py` / `pipeline.py`) + Node live poller payload. **No frontend HTML/CSS.**

## Applied

### [1] Bounding box scaling & sliver prevention (`dual_lpr.py` / `wpod_net.py`)

- `resolve_xyxy_to_pixels` — scale det boxes to **original** macro/frame `orig_w`/`orig_h`; treat ≤1.5 as normalized.
- `pad_xyxy` / `crop_micro_from_box` — **10%** pad (`FM_ANPR_BOX_PAD`, default `0.10`).
- Reject before FastALPR / PP-OCRv4 if crop **height &lt; 15** or **width &lt; 30** (`FM_ANPR_MIN_MICRO_H` / `FM_ANPR_MIN_MICRO_W`).
- Cascade no longer OCRs the whole vehicle chassis as a soft fallback.

### [2] Cascaded detection (already locked; hardened)

1. YOLO vehicle → vehicle macro  
2. Plate localize **inside** macro  
3. Local plate coords + `vehicle_origin` → absolute frame  
4. Dual OCR only on valid micro

### [3] Track debounce

- Temporal consensus across **3** frames (`TEMPORAL_N`); majority (≥2) locks plate string.
- Live WS emit **only** when `temporalLocked` + plate present.
- Then **one** emit per Track ID; block **3s** (`FM_ANPR_TRACK_EMIT_BLOCK_MS`).

### [4] WebSocket payload aliases (`lib/anprLivePoller.js`)

Emitted tick includes (legacy keys kept):

| Alias | Source |
|-------|--------|
| `id` | capture / frame / track id |
| `plateText` | locked plate |
| `macroCropUrl` | vehicleUrl |
| `microCropUrl` | cropUrl |
| `bwcUser` | deviceLabel |
| `source` | `live` |

## Operator

1. Restart `START-ANPR.bat` (loads Python modules).  
2. Restart ME8 Node (poller aliases + emit gate).  
3. Hard refresh only if testing UI; this MOB did not change HTML/CSS.

## PASS

- Micro crops are plate-shaped (not 5px slivers).  
- No OCR on rejected slivers.  
- One WS tick per locked track / 3s.  
- Payload has `plateText` / `macroCropUrl` / `microCropUrl` / `bwcUser` / `source` / `id`.
