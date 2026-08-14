# MOB DISC — When does PaddleOCR start? (subprocess worker)

**Date:** 2026-08-13  
**Audience:** Operator  
**Related:** Paddle in separate process (`paddle_ocr_worker.py`) so PyTorch does not crash (`shm.dll`).

---

## Short answer

**You do not click a separate “Start Paddle” button.**  
**Paddle does not wake up by itself after 90 seconds.**

| What | Truth |
|------|--------|
| 90 seconds | Max **wait** for the **first** OCR only (model loading). Not a countdown clock. |
| When Paddle starts | The **first time** a plate crop is sent to OCR. |
| Until then | ANPR window can look “quiet” except `/watch/events` and `/health`. That is normal. |

---

## What your log means

You saw:

- `GET /watch/events` many times → Fleet is only **asking for hits** (empty).
- `GET /health` → UI checking engine.
- **No** `POST /watch/start` → Python never opened the camera stream.
- **No** `[PADDLE-CLIENT]` / `[PADDLE-WORKER]` → Paddle never ran (nothing to read yet).
- FastALPR / ONNX lines on health → old banner / health side path; **live plate OCR is meant to be Paddle in the worker**, after a crop exists.

So: sidecar is up, but **watch video was never started for native ingest**.

---

## What you do (simple steps)

1. Keep **`START-ANPR.bat`** window open (`C:\ME8`).
2. Keep **Fleet** running.
3. In the browser: **Analytics → ANPR → Start watch** on a cam that is **already live** (tile/wall video on).  
   - Native mode only uses an FLV URL that WVP already has.  
   - ANPR must **not** call WVP `ensurePlay` (protects concurrent streams).
4. When a car/plate is found, the first OCR may take a while (cold start — up to ~90s once).  
5. Then look for: `[PADDLE-CLIENT] spawn worker` and `[PADDLE-WORKER] … init OK` / `RAW=…`.

If you never see `/watch/start` or `[ANPR-NATIVE]`, Paddle will never start — fix watch/FLV first, not Paddle.

---

## Banner text in the black window

The lines that still say **“FastALPR + CLAHE”** are **stale bat echo text**.  
They do not mean Paddle is off. (Update bat echo later with a named APPLY if you want the window text to match.)

---

## Remember

**Home folder:** `C:\ME8`  
**ANPR:** `START-ANPR.bat` — leave open  
**Paddle:** auto on **first plate OCR**, not a 90s timer, not a second click  

---

## Locked

- Do not load Paddle inside the main YOLO/PyTorch process.  
- Do not start WVP plays from ANPR sync (`ensurePlay` banned for this path).
