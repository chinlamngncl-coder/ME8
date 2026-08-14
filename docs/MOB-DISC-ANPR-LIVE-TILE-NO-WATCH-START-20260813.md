# MOB DISC — ANPR live shows car but Recent Plates empty (2026-08-13)

**PASS/FAIL context:** Operator put car (plate visible, e.g. NIS 8559) in front of BWC **kk**. ANPR Live tile shows video. Recent Plates = AWAITING CAPTURE. ANPR bat log = only `GET /watch/events` + `GET /health`. **No** `POST /watch/start`, **no** `[ANPR-NATIVE]`, **no** `[PADDLE-*]`, **no** `[ANPR-FUNNEL]`.

---

## Plain English — what is broken

**The picture on screen is not the same as “Python is reading the video.”**

| What you see | What it means |
|--------------|----------------|
| Live tile + Stop Stream | Browser is playing WVP/FLV video (for your eyes). |
| Recent Plates empty | No plate hit was published. |
| ANPR window only `/watch/events` | Fleet is polling for hits. Python never opened its own capture. |
| No `/watch/start` | Native ingest never started → no frames → no YOLO → no Paddle → nothing. |

Paddle / FastALPR / 90s load are **not** the problem yet. The pipe stops **before** OCR.

---

## How it is supposed to work

1. You click **Start watch** → browser plays video **and** tells Fleet which cams (`anpr-watch-slots`).
2. Fleet (native mode) looks up the cam’s **upstream FLV** URL (read-only from WVP map — **must not** call `ensurePlay` from ANPR).
3. Fleet `POST /watch/start` → Python `cv2.VideoCapture(url)`.
4. Then Stage-1 / Stage-2 / Paddle worker → Recent Plates.

Your log proves step 3 never happened.

---

## Likely cause (locked diagnosis)

Fleet `resolveFlv(camId)` returned **null** (`no_upstream_flv`), so it skipped `watchStart` every second.

Browser can still show video via **proxy FLV** on the tile. Server-side ANPR only accepts the **upstream** URL from WVP’s active map. If that map entry is missing for cam `kk` (or cam id mismatch), ANPR stays blind while you still see the car.

**Not allowed:** fix by calling `ensurePlay` from ANPR sync (harms WVP concurrent stream base).

---

## What operator should check (no code)

1. Fleet **Node console** (not only ANPR bat) for:  
   `[anpr-native] skip watchStart … no_upstream_flv`  
   or  
   `[anpr-native] POST /watch/start …`
2. Confirm Start watch is on and tile is Live (you already did).
3. Restart order: Fleet → `C:\ME8\START-ANPR.bat` → hard refresh → Start watch again.

---

## Recommended next APPLY (one MOB — agent picks)

**`ANPR-NATIVE-WATCH-START-URL-FROM-LIVE-TILE-V1`**

When the ANPR Live tile already has a working WVP handoff FLV for that cam, Fleet must get a **read-only** upstream URL the same way the tile path already warmed WVP — **without** ANPR owning `ensurePlay` in a 1s spam loop.

Concrete direction (discuss before code if needed):

- Prefer: reuse existing wall/tile handoff result already in `wvpVideoHandoff` active map; fix camId / timing so `getUpstreamFlv(kk)` is non-null after tile attach.
- Or: UI emits already-known upstream (or tokenized proxy that Python cannot use — **proxy alone is wrong for OpenCV**; need real upstream HTTP FLV).
- Never: ANPR `ensurePlay` every sync tick.

Until that APPLY PASSes, a car in front of the camera will show on the tile and still leave Recent Plates empty.

---

## Locked reminders

- Home: `C:\ME8`
- WVP base stays; no park handoff; no ANPR-driven play storm
- Paddle = subprocess only; starts on first OCR after capture works

**Status:** FAIL at ingest handshake (`/watch/start` missing), not at Paddle.
