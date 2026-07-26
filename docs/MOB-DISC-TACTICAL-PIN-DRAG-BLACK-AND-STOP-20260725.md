# MOB-DISC — Tactical pin video: move → black + how to stop

**Date:** 2026-07-25  
**Status:** Bug **FIXED** in code (await operator re-smoke); stop behavior documented  
**APPLY:** `TACTICAL-PIN-DRAG-NO-POPUP-UPDATE-WIPE-V1`  
**File:** `public/js/tactical-poi.js` only (not Firmware Gold `video-wall.js`)

---

## What you saw (plain English)

1. **Grab circle → Open grabbed** → pin video shows. Good.  
2. **Drag / move the pin video** (title bar) → picture goes **black**.  
3. Ops / BWC wall may **still** show video.  
4. Felt like you **couldn’t stop**.

---

## Why (one sentence)

Moving the pin called Leaflet’s `popup.update()`, which **rebuilt the popup HTML and threw away the live video element**. The empty box looked black. The wall uses a **different** player, so it kept playing.

---

## How to stop video (today)

| What you click | Pin video on Tactical | Ops wall / BWC tile |
|----------------|------------------------|---------------------|
| **X (cross)** on the pin popup | **Stops** that pin stream and closes the popup | **Does not** stop the wall |
| Draw a new grab / Open grabbed again | Stops previous pin lives, opens new set | Wall unchanged |
| Wall Stop / tile controls | No | Yes (wall’s own stop) |

So: **yes — the cross (X) on the pin is the stop for that pin.**  
If the wall is still live after X, that is expected until you stop the wall separately.

After the black bug, X still cleaned the (orphan) player and closed the popup — but the picture was already dead, which felt broken.

---

## Fix applied

- Drag / spiderfy offset moves use **`_updatePosition()` only** — no full `update()` content wipe.  
- Cache bust: `tactical-poi.js?v=20260725-tactical-pin-drag-no-popup-wipe-v1`

### Re-smoke (you)

1. Restart not required for static JS — **Ctrl+F5**  
2. Tactical → Grab → Open grabbed → video live  
3. **Drag the pin title bar** → video must **stay** live (not black)  
4. Click **X** → pin closes / stops; wall may still run (OK)

---

## Optional later (not this MOB)

- Label the X as **Stop** / add an explicit Stop button on the pin  
- “Stop all grabbed pins” one button  
Say **MOB-APPLY** if you want either.
