# MOB DISC — FR roster 3–4 column group grid · less scroll · video balance

**Status:** **APPLIED 2026-07-11** — `mob-fr-roster-group-grid`  
**Trigger:** Single full-width column still feels long; **6–8 BWCs per group** normal; scrolling is **user unfriendly**  
**Search:** 3 column, 4 column, group grid, masonry, less scroll, video height  
**APPLY name:** `mob-fr-roster-group-grid`  
**Related:** `MOB-DISC-FR-ROSTER-GROUP-COHERENT.md`, `MOB-DISC-FR-ROSTER-SCROLL-AND-WIDTH.md`

---

## Plain answer

**Yes — 3 or 4 columns — but each column holds whole groups, not split members.**

| Wrong (v1 bug) | Right (this plan) |
|----------------|-------------------|
| Chin left, kk right — **same group torn apart** | **PP block** entirely in column 1 |
| One wide table row | **Group card** per sector |

**Scroll:** One **short** roster band under video — **4 collapsed groups = 1 visual row** (4 columns). Expand one group → members grow **down inside that column only**. Page scroll avoided; tiny inner scroll only if many expanded at once.

---

## Typical fleet (your norm)

| Reality | Design for |
|---------|------------|
| **6–8 BWCs per map group** | Expand shows 6–8 lines **under one header** |
| **Several groups** (PP, sectors, beats) | **3–4 groups visible collapsed** without scroll |
| **32 watch cap** | Unchanged — selection across all columns |
| **6 live video** | Unchanged — tiles above roster |

---

## Layout wireframe (locked direction)

### Video + roster balance

User said: **don’t need so much video height** — roster deserves horizontal space.

```
┌─ 6 video (3×2) — slightly shorter max-height ────────────┐  ┌ snap ┐
│  [1] [2] [3]                                              │  │ rail │
│  [4] [5] [6]                                              │  │      │
├───────────────────────────────────────────────────────────┤  │      │
│ [Start][Stop][Clear]  12/32 · 4/6 live    [search][filt] │  │      │
│ ┌──────────┬──────────┬──────────┬──────────┐            │  │      │
│ │ ▼ PP     │ ▶ North  │ ▶ South  │ ▶ East   │  ← 1 row   │  │      │
│ │  Chin    │          │          │          │   height   │  │      │
│ │  kk      │          │          │          │   collapsed│  │      │
│ │  …×6     │          │          │          │            │  │      │
│ └──────────┴──────────┴──────────┴──────────┘            │  │      │
└───────────────────────────────────────────────────────────┘  └──────┘
```

| Change | Value |
|--------|--------|
| Video grid `max-height` | **~42vh → ~32vh** (shorter tiles, more roster) |
| Roster band `min-height` | **~220px** fixed |
| Columns | **4** desktop · **3** laptop · **2** narrow |

---

## Column rules (logical — never stupid split)

### Rule 1 — **Group is atomic**

One group = one **card** in exactly **one** column.

```
Column 1          Column 2
┌─ PP ─────┐      ┌─ North ──┐
│ ▼ header │      │ ▶ header │
│  member  │      └──────────┘
│  member  │
└──────────┘
```

**Never** put PP header in col 1 and kk in col 2.

### Rule 2 — **How groups fill columns**

| Method | Use |
|--------|-----|
| **Round-robin** (v1 ship) | Group A→col1, B→col2, C→col3, D→col4, E→col1… Simple, predictable |
| **Shortest-column** (v1.1) | Put next group in column with **fewest lines** — better balance when one group expanded |

Lab: PP, North, South → cols 1–3. **PP expanded (8 lines)** stays in col 1 only.

### Rule 3 — **Expand / collapse** (same as group-coherent)

| Size | Default |
|------|---------|
| ≤4 members | Expanded |
| 5–8+ | Collapsed `▶ PP · 8 online · 3 in watch` |
| User ▶/▼ | Overrides session |
| Search / live on tile | Auto-expand that group |

### Rule 4 — **8 members in one group**

```
Column 1 only:
▼ PP · 8 online · 6 in watch
    officer 1
    …
    officer 8        } ~9 lines — scroll inside column OR whole roster band
```

Other columns still show **collapsed** groups at **one line each** — operator sees **North / South / East** without scrolling.

---

## 3 vs 4 columns (locked)

| Breakpoint | Columns |
|------------|---------|
| Wide (≥1280px) | **4** |
| Default (≥960px) | **3** |
| Narrow (<960px) | **2** (fallback) |

**Recommend ship 4** on your ops laptops if wide enough; CSS handles 3 automatically.

---

## Scroll policy (user-friendly)

| Scroll | When |
|--------|------|
| **No page scroll** for roster | Roster is fixed band under video |
| **No horizontal scroll** | `overflow-x: hidden` |
| **Vertical** | Only inside roster band **if** total content > ~220px |
| **Target** | **4 collapsed groups + toolbar** visible **without** scroll |
| **Dark scrollbar** | Same as width-compact MOB — **no white bar** |

**Goal:** Operator sees **PP + 3 other sectors** at a glance; open one group to pick officers.

---

## Group card UI (per column cell)

```
┌─────────────────────────┐
│ ▶ [☑] ● PP  8/8 · 3 watch │  ← header, compact
├─────────────────────────┤
│   [☑] 📌 ● Chin (…0008)  Rotate │  ← members when expanded
│   [☑] 📌 ● kk   (…0009)  Live 2 │
└─────────────────────────┘
```

- Card border `1px #334155`, radius 6px, background `#0b1220`
- **No** full-width table spanning 1200px
- W/P/St/Tile columns **only inside card** — narrow

---

## Video layout trade (shift up)

| Element | Today | After grid MOB |
|---------|-------|----------------|
| `.ax-fr-grid` flex | Eats most vertical space | `max-height: 32vh` cap |
| `.ax-fr-watch` roster | Cramped below | **Taller** — multi-col grid |
| Snap rail | Right of main | **Unchanged** |

**6 tiles still 3×2** — slightly shorter cells, **wider roster** uses full width under tiles.

Optional **later:** roster column under snap rail only (narrow) — **not** in this MOB unless grid PASS fails.

---

## MOB plan

| MOB | Files | Delivers |
|-----|-------|----------|
| **`mob-fr-roster-group-grid`** | `fr-live-watch.js`, `index.html` CSS | 3–4 col group cards, round-robin, video cap |
| Reuse | — | expand/collapse, 32 cap, dark scrollbar from prior MOBs |

**Remove:** single full-width `<table>` for roster body → **div grid** of group cards.

**Risk:** Tier **1** — FR roster + video **max-height** only · no server · no wall/PTT/SOS

---

## PASS checkpoint

| # | Look for |
|---|----------|
| 1 | **4 groups collapsed** ≈ **one horizontal band** (4 cols) |
| 2 | PP + all members in **one column** — never split |
| 3 | Expand PP (6–8) — other groups still **one line** in their columns |
| 4 | Video tiles **slightly shorter**, roster **taller** |
| 5 | Scrollbar **dark**, not white |
| 6 | Start / Stop watch unchanged |

---

## FAQ

**Q: 12 groups — still scroll?**  
A: **4 cols × 3 rows** of collapsed cards ≈ 12 visible in ~220px before scroll — far less than 12 stacked lines today.

**Q: One huge group 20 officers?**  
A: Stays **one column card**; expand scrolls **inside band**; others stay collapsed one-liners.

**Q: Why not 6 columns?**  
A: Too narrow for `Officer (…id) · Tile` — **4 max** on desktop.

**Q: Who designed the wide single column?**  
A: Iteration mistake — **grid of group cards** is the enterprise fix.

---

## Order

```text
MOB-APPLY mob-fr-roster-group-grid
```

Then (separate):

```text
MOB-APPLY mob-fr-stop-video-toolbar
```

---

## Bottom line

| You said | Plan |
|----------|------|
| 3–4 columns | **4 cols** (3 on smaller screens) — **whole group per cell** |
| 6–8 BWC per group | Expand **inside** that group’s card |
| Don’t make users scroll | Collapsed groups share **one row** of columns |
| Less video space | ~~**Shorter tile max-height**~~ **REVERTED in** `mob-fr-tile-human-aspect` — roster uses **fixed band**, not video crush |
| APPLY | `MOB-APPLY mob-fr-roster-group-grid` when ready |
