# MOB DISC — Weapon tile expand + pop-out with embedded map — 2026-08-11

**Status:** PAPER ONLY — no code.  
**Read:** `.cursorrules` · zero-change without APPLY · one MOB at a time · Firmware Gold pin/video locked unless named.  
**Operator ask:** (1) FR/ANPR click-expand for Weapon too? (2) Video pop-out with small live map + pin; dual view modes doable?

---

## 1) Tile click → big (take over grid) → click again → grid

### What you remember — correct for FR / ANPR

| Surface | Behavior today |
|---------|----------------|
| **FR Live** | `expandedTileId` — click expands one tile over the 6-grid; click again restores |
| **ANPR Live** | Same pattern on the 4-grid |
| **Weapon Live** | **Not wired** the same way (roster expand ≠ tile expand). Your screenshot = Weapon 6-grid + Recent; pop-out icon on tile 1 is separate |

So: **yes, we can do the same for Weapon** — copy the FR/ANPR expand pattern onto `weapon-live-watch` grid CSS + click handler. Low risk if we **reuse** the same classes (`is-tile-expanded` / `is-expanded` / `is-expanded-hidden`) and keep `AxiomFlvManager` on one tile (no second player).

**Recommended MOB (when you APPLY):** `WEAPON-LIVE-TILE-EXPAND-V1`  
**Scope:** Weapon Live watch only — click video area (not buttons/pop-out) toggles expand; click again collapses.  
**Not in that MOB:** toast drag, Colab, FP threshold.

---

## 2) Video pop-out + small map (pin running) — dual “opposite” views

### What exists today (high level)

- **Ops base:** map is the stage; pin(s) move; pin / wall can show **small video** (Firmware Gold = mirror from wall when live — do not invent a second JSMpeg).  
- **Video pop-out:** tile “pop-out” opens a **detached / large video** window or surface (analytics also has popout modes). Map pop-out exists as `?popout=map` style desk chrome — different job.

### What you want

| Mode | Stage | Overlay |
|------|--------|---------|
| **A — Ops classic** | Map + running pin | Small video (follow / pin) |
| **B — Video classic (new)** | Large video | **Small map** with **same pin moving**, draggable / resizable |

### Is B doable?

**Yes — doable.** Same GPS / device id already drives Ops pins; a pop-out can host a **second Leaflet (or shared map) instance** bound to that cam’s track, with a floating panel (drag + resize). This is a **product feature genre**, not a one-line CSS tweak.

### Risk / locks (must respect)

1. **Firmware Gold:** pin video on Ops map stays **canvas mirror from wall** when wall is live — do not re-enable dual pin JSMpeg. Pop-out Mode B is a **new surface**; still use **`AxiomFlvManager.attach()`** for the large video only.  
2. **One FLV player hygiene:** detach/destroy when closing pop-out (no leak).  
3. **Two map instances:** Ops map + pop-out mini-map must not fight the same DOM node; mini-map = own container, same lat/lng feed.  
4. **Drag / resize:** panel chrome only — don’t break video live-edge chase.  
5. **Credit / scope:** do **not** bundle with tile-expand or ANPR Colab.

### Honest effort order (one recommendation)

| Phase | MOB | Why |
|-------|-----|-----|
| **1** | `WEAPON-LIVE-TILE-EXPAND-V1` | Matches FR/ANPR you already know; small; proves parity |
| **2** | `VIDEO-POPOUT-MINIMAP-V1` | Pop-out = large video + embedded map + pin; drag + resize panel |
| **3** (optional) | polish sync / follow-pin / size presets | After Mode B PASS |

**Do not** start Mode B by rewriting Ops map. Mode A stays as-is.

### Mode B acceptance (operator)

1. Open Weapon (or Ops) video pop-out for cam **kk**.  
2. See **large live video**.  
3. See **small map** with **kk pin moving** (GPS updates).  
4. Drag map panel; resize larger; video stays live.  
5. Close pop-out → no stuck player / map.

---

## Verdict

| # | Question | Answer |
|---|----------|--------|
| 1 | Weapon click-expand like FR/ANPR? | **Yes.** Missing today; copy FR/ANPR pattern. |
| 2 | Pop-out = video large + map+pin small, opposite of Ops? | **Yes, doable** as a separate genre; not free — new mini-map in pop-out + pin bind. |

---

## One next step

When you want code for (1) only:

```text
MOB-APPLY WEAPON-LIVE-TILE-EXPAND-V1
```

Park (2) until expand PASS (or say you want minimap first — your override).
