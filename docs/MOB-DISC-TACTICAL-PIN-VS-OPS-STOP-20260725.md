# MOB-DISC — Ops is Ops; Tactical pin is pin (stop concept)

**Date:** 2026-07-25  
**Status:** LOCKED concept + stop fix applied  
**Related APPLY:** `TACTICAL-PIN-STOP-RELEASE-BWC-V1` + rename **B** (Select zone / Open cameras)

---

## Concept (do not destroy)

| Surface | Job |
|---------|-----|
| **Operations (Ops)** | Fleet map + video wall panels. Ops stop / wall tiles stay Ops. |
| **Tactical pin** | Live on the **pin popup** only (select zone → open cameras). Pin stop stays on the pin. |

- Opening cameras on Tactical must **not** require an Ops wall tile to show video.  
- Closing / stopping a Tactical pin must **not** blank or “own” Ops.  
- If Ops wall is **also** live on that cam, pin close must **not** kill the Ops stream.

---

## What was wrong (your report)

1. X / close on Tactical pin only **destroyed the pin player**.  
2. For **BWC**, the server live (WVP / soft-open) **kept running**.  
3. So it felt like “cross does nothing” — you had to go to Ops to stop.  
4. Ops panel often showed **no** tile picture (stream was live in the background) — confusing, but the stop there was the real BYE.

That was a **pin stop hole**, not a reason to merge Ops and Tactical.

---

## Fix (keeps the concept)

On Tactical pin **Stop** or **X** (`popupclose`):

1. Destroy pin FLV player.  
2. If **fixed** cam → existing ZLM lease stop.  
3. If **BWC** → emit `stop-video` with surface **`tactical`** (new surface; does **not** steal Ops viewer refs).  
4. If **Ops wall still claims** that cam → **skip** server stop (Ops keeps live).

Also added a clear **Stop** button on the pin (besides Leaflet X).

---

## How you stop (plain)

| Click | Effect |
|-------|--------|
| Pin **Stop** or **X** | Stops that Tactical pin + releases BWC if Ops is not using it |
| Ops wall Stop | Stops Ops (unchanged) |

You should **not** need Ops to stop a Tactical-only pin anymore.

---

## Rename B (applied)

| Old | New |
|-----|-----|
| Grab circle | **Select zone** |
| Open grabbed | **Open cameras** |

---

## Re-smoke

1. **Ctrl+F5** (and restart server once — `liveViewers` surface change)  
2. Tactical → **Select zone** → **Open cameras** → video on pin  
3. Click **Stop** (or X) → pin closes; BWC should leave live **without** opening Ops  
4. Optional: open same cam on Ops wall, then Stop pin only → Ops should **stay** live  

PASS / FAIL from what you see.
