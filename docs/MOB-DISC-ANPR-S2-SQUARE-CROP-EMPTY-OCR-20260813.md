# MOB DISC — Stream works; Stage-2 crop is not a plate (2026-08-13)

**Operator log (this session):** `/watch/start` + capture open **PASS**. Recent Plates empty because OCR got a **47×48 square**, not a plate.

---

## Plain English

The camera **is** reaching ANPR now. That old “no stream” bug is not this fail.

What happened:

1. Car found (Stage 1).
2. Plate finder cut a **tiny square** (`47×48`) — a real plate is a **wide strip** (example earlier: `76×182`).
3. OCR ran on that square, got **no letters**, confidence ~0.77 on junk, then **correctly dropped** it (so you do not see `中` / empty cards).
4. Start watch was sent **three times**, which **restarted** the camera mid-read (`watch stopped`).

So: not “nothing ran.” It ran on the **wrong crop**.

---

## Next APPLY (one)

**`ANPR-S2-REJECT-SQUARE-CROP-AND-NO-RESTART-V1`**

- Reject Stage-2 boxes that are not plate-shaped (too square / too small).
- If same cam + same URL already watching, **do not** spawn a new thread.

Files: `anpr-sidecar/plate_pose_ccpd.py`, `anpr-sidecar/native_watch.py` only.  
**No WVP / ZLM / `ensurePlay`.**

Operator: type that APPLY name, then restart `START-ANPR.bat` only (Fleet already has stream).
