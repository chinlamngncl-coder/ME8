# MOB DISC — Evaluate wall aspect-ratio fixes (NO APPLY)

**Status:** DISC only — 2026-07-19 · **no code · no APPLY**  
**Subject:** `MOB-DISC-EVALUATE-AR-FIXES`  
**Stream:** ZLM ~**1280×720 (16:9)**  
**Surfaces checked:** Ops `#video-wall` / `.video-slot-stage` (primary ZLM mount) · Command Wall `#cw-wall` / `.cw-cell-stage` (same AR problem class)

---

## Live layout facts (from CSS/DOM)

### Ops wall (where ZLM primary mounts today)

```
#video-wall          → fixed width 272px, flex column, fills right rail height
#video-wall-slots    → flex:1 column
.video-slot          → flex:1 each (equal share of height) × typically 6
.video-slot-box      → flex column (head + stage)
.video-slot-head     → fixed chrome (id / status / buttons)
.video-slot-stage    → flex:1; min-height:0; NO aspect-ratio
video.me8-zlm-soft-overlay → absolute 100%×100%; object-fit:contain (today)
```

**Implication:** Stage shape is **not** 16:9 by design.  
Width ≈ **~260–264px** (fixed rail). Height ≈ **(window height − chrome) / 6** minus head.  
On a normal Ops window, stages are usually **wider than 16:9** (short height, fixed width).

Example (typical): stage ~264×90 → W/H ≈ **2.9** vs 16:9 ≈ **1.78**.

### Command Wall matrix

```
#cw-wall → CSS grid; schemes 1 / 4 / 9 / 16 (+ focus)
.cw-cell → flex column; .cw-cell-stage → flex:1; min-height:0
canvas fills stage absolute inset 0 (stretch today; ZLM would same host pattern)
```

Cell AR **changes with layout + monitor**. Same conflict class: fluid cell ≠ camera 16:9.

---

## Option 1 — Layout fix: `aspect-ratio: 16/9` on `.video-slot-stage`

### Will it break the dashboard?

**Risk: high if applied naively on `.video-slot-stage` itself.**

Why:

1. Ops wall **depends on fluid equal stretch** (`flex: 1` × 6) to fill the right rail with no scroll.  
2. `aspect-ratio: 16/9` + width 100% wants height ≈ **width / 1.778 ≈ 148px** per stage.  
3. Six × ~148px ≈ **890px** of stage alone — often **taller than the rail**. Flex + aspect-ratio then fights: overflow, clipped panels, uneven gaps, or empty dead space under a shorter stack.  
4. The rail width is **fixed 272px**; height is **viewport-driven**. AR lock removes the “fill whatever height we have” contract the wall was built on.

### Viability

| Approach | Viable? |
|----------|---------|
| Blind `aspect-ratio:16/9` on `.video-slot-stage` | **No** — layout breakage likely |
| Stage stays `flex:1`; **inner** player frame `aspect-ratio:16/9` centered in stage | **Yes** — same as today’s letterbox, but geometry explicit; **does not** break rail fill |

So Option 1 as stated (force stage to obey 16:9) is **not safe**. A **nested** 16:9 frame inside the fluid stage is the only layout-safe variant.

---

## Option 2 — Crop fix: `object-fit: cover` on `<video>`

### What cover does on Ops panels

Leave UI alone; scale video until the stage is full; crop overflow.

On typical Ops stages (**wider than 16:9**):

- Cover scales until **width** fills → extra height is cropped.  
- Crop is mostly **top and bottom** (not left/right).

Rough scale for ~264×90 stage: about **~15–25% of frame height** lost (split top+bottom), depending on exact window height / slot count.

### How severe for BWC?

| Area | Risk with cover on short Ops slots |
|------|-------------------------------------|
| Top OSD / timestamp / hat / face top | **High** — often in top band |
| Sides / shoulders | Lower on wide-short panels |
| Ground / feet | **High** — bottom crop |
| Evidence / court review | **Bad** — silent loss of pixels |

On Command Wall 2×2 / large cells, crop can be milder; on 4×4 small cells, crop can be worse again. **Not stable across schemes.**

### Viability

**Works visually (fills panel)** but is **unsafe as default for enterprise BWC** because it **discards** picture at the margins where operators and evidence often need it.

---

## Definitive recommendation (enterprise surveillance)

**Do not ship Option 2 (`cover`) as the default Ops/CW live fit.**  
Filled panels are not worth cutting BWC top/bottom for SOS / ID / evidence.

**Do not ship naive Option 1** (`aspect-ratio` on `.video-slot-stage`).  
It fights the Ops rail flex contract and can break the dashboard column.

**Safest path:**

1. **Keep fluid stages** (current flex / grid fill).  
2. **Keep `object-fit: contain`** (or an inner 16:9 box with contain) so **100% of 1280×720 stays visible**.  
3. Accept letterbox (black bars) as correct for mismatched panel AR.  
4. If operators want “less soft / bigger picture,” enlarge usable stage by **UI chrome** (taller Ops rail / fewer simultaneous slots / bigger CW scheme) — not by cropping.

**Optional later APPLY (only if named):**  
`MOB-APPLY-WALL-INNER-16x9-FRAME` — inner centered 16:9 host inside fluid stage; still **contain**; no cover; no change to `#video-wall` flex math.

---

## One-screen for Google / operator

| Option | Layout risk | Footage risk | Enterprise default? |
|--------|-------------|--------------|---------------------|
| 1. AR on `.video-slot-stage` | **High** (flex rail) | Low | **No** |
| 1b. Inner 16:9 in fluid stage | Low | Low | **OK** (polish) |
| 2. `object-fit: cover` | Low | **High** (top/bottom crop on Ops) | **No** |
| Current contain | Low | Low | **Yes — safest** |

**Verdict:** Safest path = **stay with contain + fluid panels**; if polish is needed, use an **inner 16:9 frame**, not cover and not AR on the flex stage itself.

---

## Your call

No APPLY from this disc. If you want a named polish later, say **`MOB-APPLY-WALL-INNER-16x9-FRAME`** (or reject and keep contain-only).
