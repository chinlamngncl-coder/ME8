# MOB DISC — FR 6-tile grid · fit all six on screen (stop aspect-ratio regressions)

**Status:** **APPLIED 2026-07-11** — `mob-fr-tile-grid-fit-six`  
**Search:** 6 become 3, covered, aspect ratio, grid fit, thumbnail, worst  
**APPLY name:** `mob-fr-tile-grid-fit-six`  
**Related:** `MOB-DISC-FR-TILE-HUMAN-LAYOUT.md` (superseded approach — **do not re-apply aspect-ratio tiles**)

---

## Honest post-mortem (good → bad → worst)

| Step | MOB / change | What happened |
|------|----------------|---------------|
| **Good** | Before roster-grid | 6 tiles in 3×2, all visible, video OK-ish |
| **Bad** | `mob-fr-roster-group-grid` | `max-height: 32vh` → wide flat bars, video thumbnail |
| **Worse** | `mob-fr-tile-human-aspect` | `aspect-ratio: 3/4` per tile → each tile **~400px tall**, row 2 off screen |
| **Worst** | layout pass 2 | `flex: 0 0 auto` on grid → **3 skyscraper tiles**, 4–6 barely visible at bottom |

**Root mistake:** Tried to fix **video shape** with **per-tile aspect-ratio** in a **3×2 grid** without a **bounded video zone**. The math never fits a laptop viewport.

```
3 columns × ~280px wide × aspect 3:4 = ~373px per tile
2 rows = ~746px grid + toolbar + roster + header  →  row 2 clipped
```

**Not giving up.** The fix is simpler than what we tried: **VMS mosaic** — equal cells in a flex-bounded zone. No per-tile aspect-ratio.

---

## What your screenshot shows (FAIL)

- Tiles **1–3**: full-height portrait skyscrapers  
- Tiles **4–6**: only top edge visible at bottom of screen  
- Roster: not visible  
- **6 became 3** — exactly the math above

---

## Correct model (industry)

| VMS / control room | Our FR watch |
|--------------------|--------------|
| **Video zone** = **capped** preview (~320px) — **not** flex-grow | ~~`.ax-fr-grid` gets `flex: 1 1 0`~~ → see `MOB-DISC-FR-PANEL-BALANCE-VIDEO-ROSTER.md` |
| **6 equal cells** in 3×2 | `grid-template-rows: repeat(2, 1fr)` |
| **No aspect-ratio on cell** | Cell size from zone, not from CSS ratio |
| **Video `contain` inside cell** | Portrait BWC letterboxes — **acceptable** |
| **Roster = fixed band below** | `.ax-fr-watch { flex: 0 0 240px }` |
| **Click to enlarge** (later) | Lightbox / focus tile — not in this MOB |

**Rejected forever for 6-up grid:** `aspect-ratio` on `.ax-fr-tile` in 3×2.

---

## Locked spec — `mob-fr-tile-grid-fit-six`

### Layout wireframe

```
┌─ ax-fr-left (flex column, min-height: 0) ─────────────┐
│ ┌─ ax-fr-grid  flex:1 — ALL remaining height ────────┐ │
│ │  [1]      [2]      [3]   ← equal cells, 50% row   │ │
│ │  [4]      [5]      [6]   ← always visible         │ │
│ └────────────────────────────────────────────────────┘ │
│ ┌─ ax-fr-watch  flex:0 0 240px — roster band ────────┐ │
│ │  Start/Stop · search · 4-col group cards           │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### CSS (locked)

```css
.ax-fr-left {
    flex: 1; min-width: 0; min-height: 0;
    display: flex; flex-direction: column; gap: 8px;
    overflow: hidden;
}
.ax-fr-grid {
    flex: 1 1 0; min-height: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: repeat(2, minmax(0, 1fr));
    gap: 6px;
}
.ax-fr-tile {
    position: relative;
    min-height: 0; min-width: 0;
    width: 100%; height: 100%;
    /* NO aspect-ratio */
}
.ax-fr-watch {
    flex: 0 0 240px; min-height: 200px;
    overflow: hidden;
}
```

### Portrait BWC in landscape-ish cells

Cells will be **wider than tall** on most screens. Portrait video letterboxes left/right. **Trade:** all 6 visible + usable cell height > perfect portrait cell shape.

| Priority | Rule |
|----------|------|
| 1 | **All 6 tiles visible** without scroll |
| 2 | **Roster visible** below |
| 3 | Video as large as possible inside cells |
| 4 | Perfect portrait cell shape | **Later** (focus tile / lightbox) |

---

## MOB plan

| MOB | Files | Delivers |
|-----|-------|----------|
| **`mob-fr-tile-grid-fit-six`** | `index.html` CSS only | 6 equal tiles + fixed roster band |
| **Not** | `fr-live-watch.js` | No JS |
| **Revert** | aspect-ratio, 32vh cap, flex:0 grid | All removed |

**Risk:** Tier **1** — FR CSS only · rollback = revert CSS block

---

## APPLY

```text
MOB-APPLY mob-fr-tile-grid-fit-six
```

---

## PASS checkpoint

Hard refresh → Analytics → Face recognition:

| # | Must see |
|---|----------|
| 1 | **All 6** tiles full size on screen — not 3 skyscrapers |
| 2 | Tiles **4, 5, 6** same height as **1, 2, 3** |
| 3 | **Roster** visible below grid (Start/Stop, group cards) |
| 4 | No giant dead black band between grid and roster |
| 5 | Live video fills cell reasonably (`contain`) |
| 6 | Snap rail unchanged |

Screenshot PASS/FAIL enough — no words needed.

---

## Why each past MOB failed

| Idea | Why it failed |
|------|----------------|
| Shorter video `32vh` | Pancake cells → thumbnail video |
| Portrait `aspect-ratio 3/4` | Tiles taller than viewport → **6→3** |
| `flex:0` on grid + aspect-ratio | Skyscrapers in row 1 only |
| Per-tile shape without zone budget | **Never** works for 6-up on one screen |

---

## Bottom line

| You said | Answer |
|----------|--------|
| 6 become 3 | **aspect-ratio was wrong tool** |
| Worst part by part | Agreed — stop patching aspect; use **zone + equal grid** |
| MOB DISC | **`mob-fr-tile-grid-fit-six`** |
| Give up? | **No** — one CSS MOB, industry mosaic pattern |
