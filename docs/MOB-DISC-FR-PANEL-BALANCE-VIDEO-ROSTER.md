# MOB DISC — FR panel balance · reasonable 6 video · roster owns 7 rows

**Status:** **APPLIED 2026-07-11** — `mob-fr-panel-balance-video-roster`  
**Search:** big video, reasonable video, roster bigger, 1 group 6 officers, command wall, balance  
**APPLY name:** `mob-fr-panel-balance-video-roster`  
**Related:** `MOB-DISC-FR-TILE-GRID-FIT-SIX.md`, `MOB-DISC-FR-ROSTER-COMPACT-SEVEN-ROW.md`

---

## Plain answer — got it

| Surface | Job |
|---------|-----|
| **Analytics → Face recognition** | Watch + **pick officers** · video is a **preview**, not a wall |
| **Command wall** | **Big video** when operator needs it |

**Video:** reasonable 3×2 — all 6 visible, **capped height**, not flex-grow.  
**Roster:** **bigger** — **1 group + 6 officers in one view** (7 rows), **no scroll** for that unit. More groups / more officers → scroll inside roster.

---

## What went wrong (pendulum)

| Swing | MOB | Result |
|-------|-----|--------|
| Too small | `32vh` crush | Thumbnail video |
| Too big | `mob-fr-tile-grid-fit-six` `flex: 1 1 0` on grid | Video **eats column** — roster squeezed |
| Roster too tight | `max-height: 190px` on wrap | 7 rows cramped / scroll too early |

**You said it clearly:** you do **not** need big video here. You need **reasonable 6-up** + **roster that fits PP + 6 officers without scrolling**.

---

## Locked balance (operator spec)

```
┌─ ax-fr-left ──────────────────────────────────────────┐
│ ┌─ VIDEO  capped ~320px (or 34vh max) — NOT flex:1 ─┐ │
│ │  [1]    [2]    [3]   all 6 equal, contain        │ │
│ │  [4]    [5]    [6]   “good enough” preview        │ │
│ └────────────────────────────────────────────────────┘ │
│ ┌─ ROSTER  flex:1 — priority band ──────────────────┐ │
│ │  [Start][Stop][Clear]  meta    [Search][Online]   │ │
│ │  ▼ ☑ PP · 4/4 online          ← row 1             │ │
│ │    ☐ Chin (…0008)             ← rows 2–7          │ │
│ │    ☐ kk   (…0009)                                 │ │
│ │    … up to 6 officers — ALL visible, no scroll    │ │
│ └────────────────────────────────────────────────────┘ │
│   8th officer or 2nd group → scroll inside roster only │
└────────────────────────────────────────────────────────┘
```

### Priority rules (locked)

| # | Rule |
|---|------|
| 1 | **Roster wins vertical space** after a **fixed video cap** |
| 2 | **7 rows** (1 header + 6 officers) **visible without scroll** in default lab (1 group PP) |
| 3 | Video **never** uses `flex: 1` to steal from roster |
| 4 | All **6 tiles** still on screen in capped zone |
| 5 | Big video → **Command wall**, not FR Analytics |

---

## CSS targets (locked numbers)

| Element | Today (wrong) | Target |
|---------|---------------|--------|
| `.ax-fr-grid` | `flex: 1 1 0` | `flex: 0 0 auto; height: min(34vh, 320px); min-height: 200px` |
| `.ax-fr-grid` rows | `1fr 1fr` inside huge zone | same — cells split **capped** zone 50/50 |
| `.ax-fr-watch` | `flex: 0 0 auto` tiny | `flex: 1 1 auto; min-height: 240px` |
| `.ax-fr-roster-wrap` | `max-height: 190px` | `flex: 1 1 auto; min-height: 210px` — **no max** (fills watch) |
| Leftover in column | → video | → **roster** |

### 7-row math

| Row | px |
|-----|-----|
| Watch chrome | ~32 |
| Group header | 26 |
| 6 × officer | 6 × 22 = 132 |
| Padding/borders | ~20 |
| **Minimum roster body** | **~210px** visible for group list |

---

## MOB plan

| MOB | Files | Delivers |
|-----|-------|----------|
| **`mob-fr-panel-balance-video-roster`** | `index.html` CSS only | Cap video, grow roster |
| **Not** | `fr-live-watch.js` | No JS |
| **Not** | command wall | Locked |

**Risk:** Tier **1** — FR CSS only · rollback = revert `.ax-fr-grid` / `.ax-fr-watch` / `.ax-fr-roster-wrap`

**Supersedes** the “video gets ALL remaining height” line in `MOB-DISC-FR-TILE-GRID-FIT-SIX.md`.

---

## APPLY

```text
MOB-APPLY mob-fr-panel-balance-video-roster
```

---

## PASS checkpoint

Hard refresh → Analytics → Face recognition → PP expanded:

| # | Check |
|---|--------|
| 1 | **6 tiles** visible — not giant, not thumbnail |
| 2 | Video zone **~320px tall** feel — not half the screen |
| 3 | **PP header + 6 officers** — **no scroll** in roster |
| 4 | Roster band **taller than video** on typical laptop |
| 5 | 2nd group or 7th+ row → **scroll inside roster only** |
| 6 | Operator knows: **big video = Command wall** |

Screenshot = enough.

---

## FAQ

**Q: Will live face be tiny again?**  
A: No — capped zone is ~320px for **2 rows** ≈ **160px per tile**. Enough for FR preview; not wall-scale.

**Q: Change 3×2 or 6 tiles?**  
A: **No** — still 6-up mosaic inside cap.

**Q: Why not shrink roster back?**  
A: FR primary task = **select who to watch**. Roster is the work surface.

---

## Bottom line

| You said | Locked |
|----------|--------|
| Don’t need big video | **Cap video zone** |
| Reasonable 6 layout | **3×2 in ~320px** |
| Roster bigger | **flex:1 roster**, min 7 rows visible |
| 1 group + 6 officers in 1 view | **210px+ roster body**, no scroll |
| More → scroll | Inside roster wrap only |
| Big video elsewhere | **Command wall** |
| MOB | `mob-fr-panel-balance-video-roster` |
