# MOB DISC — FR live tiles · human-scale video (not thumbnail)

**Status:** **APPLIED 2026-07-11** — `mob-fr-tile-grid-fit-six` supersedes aspect-ratio approach  
**Supersedes:** `MOB-DISC-FR-TILE-HUMAN-LAYOUT.md` aspect-ratio tiles — **do not re-apply**  
**Search:** thumbnail, scale, aspect, tile layout, human view, video height, portrait BWC  
**APPLY name:** `mob-fr-tile-human-aspect`  
**Related:** `MOB-DISC-FR-ROSTER-GROUP-GRID.md` (roster PASS · video trade **wrong**), `MOB-DISC-FR-SNAP-RAIL-PROPORTION-GRID.md` (rail already does aspect right)

---

## Plain answer

**The roster grid MOB broke video by crushing height without locking tile shape.**

| What you see | Why |
|--------------|-----|
| Tiny vertical strip of video | BWC stream is **portrait** (~9:16) |
| Huge black bar left/right | Tile is **landscape pancake** (~3:1 wide) |
| `object-fit: contain` | Video scales to **fit height** of pancake → **~15% of tile width** |

**Fix:** Lock **tile aspect ratio** (portrait-friendly). **Remove** arbitrary `max-height: 32vh` on the grid. Roster keeps its **fixed band** — do **not** pay for roster by squashing video.

---

## What went wrong (roster-grid MOB)

```css
/* BAD — current after mob-fr-roster-group-grid */
.ax-fr-grid {
  flex: 0 1 auto;
  max-height: 32vh;   /* ← crushes entire 3×2 grid */
  min-height: 100px;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr;
}
.ax-fr-tile { /* no aspect-ratio */ }
```

On a typical laptop (~900px left column, 32vh ≈ 280px grid height):

- Each tile ≈ **300px wide × 140px tall** (2:1 landscape bar)
- Portrait video in 140px tall box ≈ **79px wide** → **thumbnail**

**Lesson:** Never cap **grid height** on a **3-wide** mosaic without **per-tile aspect-ratio**. Industry never does this.

---

## How industry does it (VMS / bodycam ops)

Patterns from control-room VMS (Genetec, Milestone, Verkada-style mosaics) and bodycam fleet UIs:

| Pattern | Use |
|---------|-----|
| **Fixed aspect cells** | Each cell has locked ratio; grid **height follows width**, not random `vh` cap |
| **`object-fit: contain`** | Full frame visible; letterbox is OK **inside a correctly shaped cell** |
| **Portrait cells for BWC** | Body-worn source is vertical — **3:4 or 9:16 tile**, not 16:9 cinema bar |
| **Primary + strip** (later) | 1 large tile + 5 small — optional v2; not required for v1 fix |
| **Click → enlarge** | Rail already has lightbox; tiles can get same later |
| **Roster = fixed band** | Selection UI gets **reserved height**; live video gets **remaining flex space** |

**Rejected for live tiles:** `object-fit: cover` (chops head/face — same rule as snap rail).

---

## Locked layout spec (v1 ship)

### Structure (unchanged DOM)

```
┌─ ax-fr-left (flex column) ─────────────────────────┐
│ ┌─ 6 live tiles 3×2 — HEIGHT FROM ASPECT, NOT vh ─┐ │
│ │ [1] [2] [3]   each cell portrait 3:4             │ │
│ │ [4] [5] [6]   video fills cell (contain)         │ │
│ └──────────────────────────────────────────────────┘ │
│ ┌─ roster band — FIXED 220px, group grid inside ──┐ │
│ │ [Start][Stop]  search  │ PP │ North │ South │…   │ │
│ └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
┌─ snap rail 240px ─┐
```

### CSS rules (locked)

| Rule | Value | Why |
|------|--------|-----|
| **Remove** `.ax-fr-grid max-height: 32vh` | — | Root cause of pancake |
| `.ax-fr-tile aspect-ratio` | **`3 / 4`** | Portrait-friendly; fits 3×2 on laptop |
| `.ax-fr-grid` rows | `grid-auto-rows: auto` | Height from tile aspect |
| `.ax-fr-grid` flex | `flex: 1 1 auto; min-height: 200px` | Video area grows in left column |
| `.ax-fr-tile-canvas` | `object-fit: contain` (keep) | Full BWC frame |
| `.ax-fr-watch` | `flex: 0 0 220px` (fixed band) | Roster grid unchanged |
| `.ax-fr-roster-wrap` | `max-height: 100%` inside watch | Scroll inside band only |

### Human PASS bar (measurable)

On **one live tile** with Chin streaming:

| Check | Pass |
|-------|------|
| Video **width** ≥ **45%** of tile inner width | ✓ |
| Video **height** ≥ **70%** of tile inner height | ✓ |
| Operator can see **face + shoulders** without squinting | ✓ |
| Tile is **not** a wide empty bar | ✓ |
| 6 idle tiles still read as a **grid of boxes**, not slivers | ✓ |

*If 3:4 still too small on your monitor, v1.1 can try `9/16` with **2×3** grid — separate MOB, not mixed into this one.*

---

## Wireframe — before vs after

### Before (FAIL — your screenshot)

```
┌──────────────────────────────────────────────────────────┐
│ 1 · Chin · …0008                                         │
│ ▌vid▐                                                    │  ← 15% width
│                                                          │
└──────────────────────────────────────────────────────────┘
        ↑ 300px wide × ~140px tall pancake
```

### After (target)

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 1 · Chin    │ │ 2 Waiting   │ │ 3 Waiting   │
│             │ │             │ │             │
│   ┌─────┐   │ │             │ │             │
│   │video│   │ │             │ │             │
│   │full │   │ │             │ │             │
│   │frame│   │ │             │ │             │
│   └─────┘   │ │             │ │             │
└─────────────┘ └─────────────┘ └─────────────┘
   3:4 box — video uses most of the box
```

---

### Follow-up fix 2026-07-11 (same MOB, layout pass 2)

Screenshot showed **portrait tiles OK** but **huge dead void** below grid — roster pushed off screen.

| Bug | Cause | Fix |
|-----|-------|-----|
| Empty black band under tiles | `.ax-fr-grid { flex: 1 1 auto }` stretched grid container taller than tile content | `flex: 0 0 auto` + `align-content: start` |
| Tiles stretched wide/flat in some cases | `align-self: stretch` on grid children | `align-self: start` on `.ax-fr-tile` |
| Roster missing | Watch panel `flex: 0 0 auto` + grid eating space | Watch `flex: 1 1 auto; min-height: 180px` |


| MOB | Files | Delivers |
|-----|-------|----------|
| **`mob-fr-tile-human-aspect`** | `index.html` CSS only | Aspect-ratio tiles, remove vh crush, flex balance |
| **Not in this MOB** | `fr-live-watch.js` | No JS unless aspect needs resize hook (unlikely) |
| **Keep** | roster group grid | 4-col cards, 220px band — **unchanged** |

**Risk:** Tier **1** — FR Analytics CSS only · no server · no wall/PTT/SOS · no locked files

**Rollback:** Revert `index.html` FR CSS block for `.ax-fr-grid` / `.ax-fr-tile` / `.ax-fr-watch`

---

## APPLY command

```text
MOB-APPLY mob-fr-tile-human-aspect
```

---

## PASS checkpoint

1. Hard refresh → Analytics → Face recognition  
2. Start watch · one BWC live  
3. Video fills **most** of tile 1 — **not** a corner thumbnail  
4. All 6 tiles are **similar-sized portrait boxes**  
5. Roster band still **4 group columns** (if you have 4 groups)  
6. Snap rail unchanged  

Reply **PASS** or **FAIL** (+ screenshot if still wrong).

---

## How to tell the agent (operator cheat sheet)

You do **not** need MOB jargon. Any of these work:

| You say | Agent understands |
|---------|-------------------|
| Screenshot + “thumbnail” / “joke” | Visual FAIL — aspect/height bug |
| “Video must fill the tile” | `aspect-ratio` + remove height cap |
| “Tiles too flat / too wide” | Pancake cells — same fix |
| “I can’t see the face” | Portrait BWC needs portrait cells |
| `MOB-APPLY mob-fr-tile-human-aspect` | Apply this DISC |

**Screenshots are the best signal** — we can see the layout. Short angry captions are fine.

---

## FAQ

**Q: Why did roster-grid shrink video?**  
A: DISC traded `max-height: 32vh` for roster space — **wrong trade**. Roster should use a **fixed band**, not steal vertical pixels from live video.

**Q: Why not make roster smaller instead?**  
A: Roster at 220px with 4 collapsed group cards is already the target. Video gets **everything above** that band.

**Q: 6 tiles won’t fit on small laptop?**  
A: Left column may scroll slightly — **acceptable**. Thumbnail video is **not** acceptable.

**Q: Match command wall layout?**  
A: **No** — command wall is locked. FR watch is its own surface with BWC portrait rules.

---

## Order

```text
MOB-APPLY mob-fr-tile-human-aspect    ← fix video NOW
```

Then (unchanged):

```text
MOB-APPLY mob-fr-stop-video-toolbar
```

---

## Bottom line

| Problem | Fix |
|---------|-----|
| Thumbnail video | **Portrait aspect tiles** + **remove 32vh crush** |
| Empty wide bars | **Locked 3:4 cells**, not 1fr×1fr pancakes |
| Roster vs video | **Fixed roster band**; video gets the rest |
| Your screenshot | Valid FAIL — apply `mob-fr-tile-human-aspect` |
