# MOB DISC — Dual-pane ops: map + wide fixed cam with limited in-video PiPs

**Date:** 2026-07-24  
**Status:** **UNDERSTANDING OK** (operator 2026-07-24) — paper locked; **no code** until a named `MOB-APPLY …`  
**Operator phrase:** `DUAL-PANE FIXED-PIP UNDERSTANDING OK`  
**Builds on:**  
- `MOB-DISC-TACTICAL-AR-CIRCLE-AND-IN-VIDEO-PINS-20260724.md`  
- `MOB-DISC-TACTICAL-MAP-AR-NOT-GLASSES-20260724.md`  
- Fixed cams + wall / WVP-FLV paths already in Fleet  

---

## Plain English — agent understanding

You refined the “in-video AR” idea into a **two-pane ops layout**, and you want **limits we can set**, starting with **fixed cameras only**.

### The 2-pane layout (“2 map solution”)

Not two basemaps for decoration — **one ops screen split in half**:

| Half | What operator sees |
|------|---------------------|
| **Left (or top)** | **Tactical / ops map** — POI pins + **BWC moving** on GPS (same map idea as today) |
| **Right (or bottom)** | **One wide / overview fixed camera** live, with **video-in-video**: several **other fixed cams** as small tiles **on or beside** that wide picture |

Wide video can be **scaled to ~half** the stage so map and video share the view cleanly.

### PiP numbers (you set the cap)

- Earlier agent caution was “a few” for CPU/wall health.  
- **Your ops need:** at least **6** in-video (or beside-video) fixed-cam views — e.g. doors + floors of a building.  
- **Product rule:** cap is **configurable** (lab default can be 6; not unlimited).  
- When the team **moves to another floor / sector**: **call other fixed cams and replace** some of the 6 slots (swap), don’t try to show every cam at once forever.

### Fixed camera only (for this path)

- **In-video / PiP slots = fixed cameras** (stable RTSP→WVP/ZLM→FLV).  
- **Moving BWC** stays on the **map half** (GPS pins), not drawn onto the video pixels (hard calibration problem — parked for later).  
- Overview / wide feed itself is also a **fixed** cam (or a designated “site overview” fixed cam).

Agent got it: map watches people move; wide fixed cam + up to N fixed PiPs watches the building; floor change = swap which fixed cams fill the N slots.

---

## Doable?

| Piece | Verdict | Notes |
|-------|---------|--------|
| Side-by-side map + video (~50/50) | **Yes** | CSS split in Tactical (or Ops) shell; map Leaflet left, player right |
| One wide fixed cam as main video | **Yes** | Existing fixed-cam / wall FLV path — one primary attach |
| Up to **6** secondary fixed-cam live tiles | **Yes, with hard cap + prove** | 6× FLV is heavy but bounded; reuse players; no JSMpeg invent; lab must prove CPU/LAN |
| Configurable cap (6 default, operator/settings later) | **Yes** | Constant / setting — not magic unlimited |
| Replace / swap PiPs when “floor” or sector changes | **Yes** | Slot model: 6 slots → pick another fixedCamId → stop old attach → start new (same as wall reopen) |
| Pins **on** the wide video frame linking to those fixed cams | **Yes (icons first)** | Pixel overlays on the overview player; click → focus/swap into a PiP slot or open wall |
| Moving BWC **on the video picture** | **Not in this MOB** | Map half only |
| Circle on map → batch open | Sister MOB (circle batch) — can feed which cams fill the 6 slots later | |

**Honest limit:** 6 simultaneous FLV attaches on one desk is the **ops minimum you want**; we treat it as a **hard ceiling for V1 of this feature**, prove in lab, then raise only with APPLY. If lab fails at 6, fall back to **icons on video + 2–3 live PiPs** until hardware allows.

WVP/ZLM stays the video base; Fleet stays; no park handoff; no new video app.

---

## Slot model (paper)

```text
┌────────────────────────────┬────────────────────────────┐
│  MAP (~50%)                │  WIDE FIXED CAM (~50%)     │
│  · POIs                    │  · Main overview FLV       │
│  · BWC GPS moving          │  · Up to N PiP slots       │
│  · (later) circle grab     │    (fixed cams only)       │
│                            │  · Floor/sector → swap     │
└────────────────────────────┴────────────────────────────┘

N = configurable, ops target ≥ 6 for building doors/floors.
```

**Floor change:** preset or list “Floor 2 cams” → replace slots 1…N with that set (tear down old FLV, attach new). Operator does not need 20 live tiles.

---

## Suggested MOB phases (not APPLY yet)

| Phase | Draft name | What |
|-------|------------|------|
| A | `TACTICAL-DUAL-PANE-MAP-WIDE-V1` | 50/50 map + one wide fixed cam (no PiPs yet) |
| B | `TACTICAL-FIXED-PIP-SLOTS-V1` | N slots (default 6), fixed cams only, swap/replace |
| C | `TACTICAL-WIDE-VIDEO-PIN-ICONS-V1` | Icons on overview → assign/focus a slot |
| Later | Circle batch → fill slots | From map circle disc |
| Much later | BWC-on-video pixels | Needs calibration — out of this track |

Do **not** bundle A+B+C in one APPLY. Recommend **A then B**.

---

## Locked (UNDERSTANDING OK)

| Item | Locked |
|------|--------|
| Split | **Left map / right wide fixed video** as default |
| PiP cap | **Configurable**; ops target **≥ 6** (lab V1 default 6) |
| PiP contents | **Fixed cameras only** |
| BWC | **Map half only** (GPS moving) — not on video pixels in this track |
| Floor / sector change | **Swap** the N slots (replace), do not stack past N |

### Build order (operator 2026-07-24)

1. **Finish Tactical genre first** (current Tactical work — POI / zones / whatever is in that genre).  
2. **Later** (after Tactical): first APPLY `TACTICAL-DUAL-PANE-MAP-WIDE-V1` (50/50 map + wide fixed cam), then `TACTICAL-FIXED-PIP-SLOTS-V1`.  

**PARKED** until operator says Tactical genre is done / names the dual-pane APPLY. Do not start dual-pane or PiP slots early.

Until APPLY — **zero code**.
