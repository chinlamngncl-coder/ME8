# MOB DISC — ANPR Live: Stop all + more than 2 cams

**Date:** 2026-07-31  
**Status:** DISC only — **no code until** named APPLY  
**Operator:** Live roster shows **Start watch / Stop** only; meta **0/2 selected**; no **Stop all**; cannot use more than 2 BWCs  
**Parent:** `ANPR-LIVE-ZLM-WATCH-V1` APPLIED · FR Face live (`fr-live-watch.js`)

---

## You are right

| Gap | Fact |
|-----|------|
| **Stop all** | Missed. FR has **Start** · **Stop** · **Stop all**. ANPR Live only has Start + Stop. |
| **Only 2 slots** | Deliberate V1 CPU cap (`LIVE_SLOTS = 2`, `MAX_WATCH = 2`, poller `FM_ANPR_LIVE_MAX_CAMS` default **2**). Not FR parity. Feels wrong next to Face. |

**Stop** today = stop video on current tiles and clear poller slots for that socket.  
**Stop all** (FR meaning) = stop video **and** clear the whole watch set (uncheck everyone) so you are not “still selected.”

---

## How FR does it (locked pattern to copy)

| Knob | Face (FR) | ANPR Live V1 (now) |
|------|-----------|---------------------|
| On-screen tiles | **6** | **2** |
| Watch set (checkboxes) | **32** | **2** |
| Overflow | Rotate cams onto tiles | None |
| Buttons | Start · Stop · **Stop all** | Start · Stop |

More cams than tiles is normal: select many, see a subset live, rotate. Poller only burns OCR on cams that are actually being watched/sampled — not 32 full-rate OCR forever.

---

## Recommendation (one path)

### Named APPLY

**`ANPR-LIVE-STOP-ALL-AND-SLOTS-V1`**

### Scope

1. **Add Stop all** — same plain English as FR: stop all ANPR live video + clear selected watch set + clear `anpr-watch-slots` for this socket. Confirm dialog optional (match FR if it asks).  
2. **Raise slots toward FR, with OCR cap honest:**
   - UI tiles: **4** on screen (grid 2×2) — readable on ANPR desk without cloning Face’s full 6 if layout is tight; **or 6** if we mirror Face grid exactly (prefer **4** first for plate CPU; env can raise).  
   - Watch set: **16** selectable (checkboxes), with **rotate** onto the 4 tiles when selected > tiles (same idea as FR).  
   - Server poller default `FM_ANPR_LIVE_MAX_CAMS`: **4** (OCR only active tile cams, not all 16 at once). Env max **6**.  
3. Meta line like FR: `{n}/{max} selected · {live}/{slots} live` — not only `0/2`.  
4. Do **not** change Snapshot / Plate lists. Do not invent map/MMR.

### Why not “32 + 6 OCR” on day one

Plate OCR per still is heavier than FR face crop. Selecting many BWCs is fine; **running OCR on 6–32 streams at once** melts lab boxes. FR-style select-many + tile rotate + poller = only the live tile cams keeps product usable.

### Operator PASS

1. Hard refresh → ANPR → Live.  
2. See **Start** · **Stop** · **Stop all**.  
3. Select **more than 2** online BWCs (up to 16); Start → up to **4** tiles live; extras rotate or wait for rotate.  
4. Stop all → video off + selection cleared + meta back to 0 selected.  
5. List hit path still works on a watched cam.

---

## APPLY line

```
MOB-APPLY ANPR-LIVE-STOP-ALL-AND-SLOTS-V1
```

No code in this disc.
