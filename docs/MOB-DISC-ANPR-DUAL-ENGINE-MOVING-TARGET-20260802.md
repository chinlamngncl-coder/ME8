# MOB-DISC — Concurrent Dual-Engine Moving-Target LPR Pipeline

**Date:** 2026-08-02  
**Scope:** Backend only (sidecar + live poller). Frontend UI untouched.  
**Mandate:** CRITICAL BACKEND ARCHITECTURE — Concurrent Dual-Engine LPR Pipeline.

## Locked architecture

| Stage | What |
|-------|------|
| 1 Sampling | Live grab **3–5 FPS** (default **250 ms** / 4 FPS). Clamp `200–333` ms unless `FM_ANPR_GRAB_UNCLAMP=1`. Drop-oldest queue still maxsize=1. |
| 1b Stabilize | Unsharp + mild CLAHE (`dual_lpr.stabilize_frame`) before YOLO / OCR. |
| 2 Crop champion | Existing YOLO vehicle macro + WPOD micro (unchanged crop path). |
| 3 Dual infer | `ThreadPoolExecutor` → **Engine A FastALPR** + **Engine B PP-OCRv4 SVTR** (Transformer ship path; MMOCR/LPRNet via `FM_ANPR_ENGINE_B` later). |
| 4 Consensus | Match → approve. Mismatch → higher conf (≥ `FM_ANPR_DUAL_CONF` default **0.90**) + region regex. |
| 4b Temporal | Last **3** compact reads per `track_id`; majority (≥2) locks string. Tracker keeps top-3 macros. |
| 5 Routing | Existing hierarchy `storage/anpr/YYYY-MM-DD/...`, `anpr_capture_history`, WS `anpr-crop-tick` / `anpr-list-hit`. |

## Files

- `anpr-sidecar/dual_lpr.py` — stabilize, dual engines, consensus, temporal
- `anpr-sidecar/pipeline.py` — wire dual on macro / cascade Stage 3; stabilize on track
- `anpr-sidecar/app.py` — `track_id` on `/read-macro`
- `lib/anprTrackBestFrame.js` — top-3 macros
- `lib/anprLivePoller.js` — 3–5 FPS + multi-macro temporal harvest
- `lib/anprSidecarClient.js` / `anprPlateRead.js` — pass `trackId`

## Env

| Var | Default | Meaning |
|-----|---------|---------|
| `FM_ANPR_DUAL_ENGINE` | `1` | Off → Engine B only |
| `FM_ANPR_DUAL_CONF` | `0.90` | Intra mismatch floor |
| `FM_ANPR_TEMPORAL_N` | `3` | Temporal window / macro count |
| `FM_ANPR_GRAB_MS` | `250` | Sample interval (clamped 200–333) |
| `FM_ANPR_GRAB_UNCLAMP` | off | Allow grab outside 3–5 FPS |
| `FM_ANPR_ENGINE_B` | `ppocrv4` | Placeholder for `mmocr` / `lprnet` |

## Operator

1. Restart ME8 + ANPR sidecar (new Python module).
2. No UI refresh required for this MOB (backend only).
3. Live track: wait for vehicle to leave view → dual OCR on up to 3 keyframes → locked plate → storage + WS.

## Hatch

- `FM_ANPR_DUAL_ENGINE=0` — single Engine B (PP-OCRv4) path.
- `FM_ANPR_GRAB_UNCLAMP=1` + higher `FM_ANPR_GRAB_MS` — slower lab sampling.
