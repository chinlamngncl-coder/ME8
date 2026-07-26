# MOB DISC — Tactical AR: circle-grab + in-video pins (understanding lock)

**Date:** 2026-07-24  
**Status:** DISC only — **no code** until named `MOB-APPLY …`  
**Related:**  
- `MOB-DISC-TACTICAL-MAP-AR-NOT-GLASSES-20260724.md` (AR ≠ glasses)  
- `MOB-DISC-TACTICAL-MAP-AR-POI-OPEN-SOURCE-STACK-20260724.md`  
- `MOB-APPLIED-TACTICAL-MAP-AR-POI-V1-20260724.md` (map POI place/link — T1 already applied)  
- User Circle batch open (wall-full toast) — sister idea for “open many at once”

---

## Plain English — what you said (agent understanding)

### Words

| Word | Meaning (locked) |
|------|------------------|
| **AR** | The **idea** — overlays on the ops surface (map and/or video), not Hololens glasses |
| **POI** | **Each pin** the operator creates (door, staging, roof cam, yard spot, …) |

### Why draw a circle (you are right — this is the ops reason)

Operators may plant **many POIs** during setup (e.g. ~20 pins around a site).  
When the incident is live, there is **no time** to click Open on each pin one by one.

**Circle = spatial multi-select + batch open:**

1. Draw a circle (or similar area) on the map.  
2. System finds **all POIs / cams / BWCs inside that circle**.  
3. **One gesture** → open those streams (same spirit as Open All / User Circle: wall budget, toast if wall full).

So:

- **Pins freely** = prepare the battlefield (many POIs, named, linked).  
- **Circle under pressure** = grab everything in that sector and get eyes up **now**.

Agent got it: circle is not decoration; it is the **fast ops tool** when pin count is high.

### Second AR meaning — pins **inside** the camera picture

Not only pins on the Leaflet map.

On a **wide / top / overview camera** (or similar “god view” feed):

1. Operator can **place a pin on the video frame** (pixel / calibrated geo if we have it).  
2. That pin links to another cam / BWC / POI.  
3. Viewer sees the **real picture** of the overview cam, and **small live tiles** of the linked streams on/near those pins — like **many PiPs inside one video** (including **moving BWC** if we can follow or update position).

So AR here = **annotated live video**: main wide shot + overlays that open or preview linked feeds.

---

## Two surfaces (same idea, different where the pin lives)

```text
SURFACE A — Map AR (Tactical Leaflet)     SURFACE B — Video AR (in-cam)
─────────────────────────────             ─────────────────────────────
Basemap / floor plan                      Wide / top / overview live FLV
POI pins on lat/lng (or image coords)     Pins on frame (x,y) or geo→pixel
Click pin → open linked                   Tap pin overlay → open / expand PiP
CIRCLE on map → batch open all inside     (later) lasso on video if needed
Prepare 20 pins calmly                    During live: see many cams “on” the scene
```

V1 applied today ≈ **Surface A lite** (place/name/link/open/delete on Tactical map).  
**Circle-grab** and **Surface B (in-video pins + multi-PiP)** are **not** in that V1 — they are the next concept layers you just clarified.

---

## Doability (honest)

### A) Map circle → open all cams/POIs inside — **YES, doable**

| Piece | Notes |
|-------|--------|
| Draw circle | Leaflet.draw already in product (zones) — reuse pattern |
| What’s inside | Point-in-circle for POI lat/lng; optionally BWC last GPS; fixed cam map positions |
| Open | Reuse wall / Command Wall / Open All / User Circle **caps** (e.g. max 8 wall, toast “Opened N of total”) |
| Risk | Low–medium if we only select + call existing open paths |

**This is the natural next MOB after map POI V1** for your “20 pins, no time to click each” story.

### B) Pins on video + many live PiPs inside one cam — **PARTLY / PHASED**

| Piece | Doable? | Notes |
|-------|---------|--------|
| Static pin on a **fixed** overview cam (pixel x,y on 16:9 frame) | **Yes** | Store pins per `camId` + normalized coords; overlay DOM/canvas on player |
| Tap overlay → open full wall / expand | **Yes** | Same open APIs as map POI |
| Small **live** PiP tiles on those pins | **Yes but heavy** | Each PiP = another FLV/JSMpeg (or mirror) attach; cap count hard (e.g. 2–4 PiPs) or wall will melt |
| **Moving BWC** pin that tracks person on the overview video | **Hard** | Needs either: (1) GPS→pixel calibration of the overview cam (homography / site survey), or (2) CV tracking (out of scope for Fleet lite). GPS→map pin is easier than GPS→pixel on arbitrary video |
| True “many cams inside video” with 10+ simultaneous PiPs | **Not practical** day-one | Same wall/CPU limits; show **icons** on video, open live only on click / circle |

**Recommendation:**

1. **Video AR Lite:** pins as **markers/icons** on overview video → click opens linked stream (full tile / wall). No 10 live PiPs at once.  
2. **Video AR PiP:** optional **1–4** live mini tiles max, operator-chosen.  
3. **BWC moving on video:** only after we have a **calibrated** overview (or stick to **map** for moving BWC — map already has GPS pins).

Moving BWC **on the map** while overview cam is open side-by-side is already the cheap “AR ops” path; moving BWC **drawn correctly on the video pixels** is the expensive path.

---

## Locked product story (one sentence)

**Plant many POIs when you have time; under fire, draw a circle and open everything in that sector; later, the same POI idea can sit on a wide-camera picture so the overview itself carries the linked eyes.**

---

## Suggested MOB order (paper — not APPLY yet)

| Phase | Name (draft) | What |
|-------|----------------|------|
| Done | `TACTICAL-MAP-AR-POI-V1` | Place/name/link/open/delete POIs on Tactical map |
| **Next (ops value)** | `TACTICAL-AR-CIRCLE-BATCH-OPEN-V1` | Draw circle → select POIs (+ optional fixed/BWC in radius) → batch open with wall cap + toast |
| Later | `TACTICAL-VIDEO-AR-PIN-OVERLAY-V1` | Pins on one overview cam frame → click to open (icons first) |
| Later+ | `TACTICAL-VIDEO-AR-PIP-CAP-V1` | Optional small live PiPs, hard cap |
| Much later | Calibrated GPS→pixel / moving BWC on video | Only with site calibration disc |

Do **not** bundle circle + in-video + PiP in one APPLY.

---

## What agent will NOT claim

- Hololens / glasses AR  
- Unlimited simultaneous PiPs inside one video  
- Pixel-perfect BWC-on-video without calibration  
- Turning off WVP handoff or rebuilding Fleet for this  

---

## Confirm with operator

Say **AR CIRCLE+VIDEO UNDERSTANDING OK** if this matches your head, or correct:

1. Circle selects **POIs only**, or also **any BWC GPS / fixed cam** inside the radius?  
2. In-video AR: **icons first** (click to open), or you need **live PiP day-one**?  
3. Moving BWC: OK to track on **map** first, video-pixel tracking later?

Then next named APPLY should be **circle batch open** unless you override.
