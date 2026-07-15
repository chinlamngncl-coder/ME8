# MOB DISC — FR video to black-box line · roster below (no void)

**Status:** **APPLIED 2026-07-11** — `mob-fr-panel-video-box-split`  
**Search:** black box, expand video, shift roster, empty void, split  
**APPLY name:** `mob-fr-panel-video-box-split`  
**Related:** `MOB-DISC-FR-PANEL-BALANCE-VIDEO-ROSTER.md` (320px cap + roster flex-grow caused void)

---

## Plain answer — yes, I see the box

Your black rectangle:

| Edge | Aligns to |
|------|-----------|
| **Top** | Top of 6-tile grid (below FR toolbar) |
| **Bottom** | ~just above Start/Stop row — **eats the empty dark void** in today’s roster panel |
| **Width** | Full left column (to snap rail) |

**Meaning:** Video grows **down to that line**. Roster (chrome + PP + 6 officers) sits **below** — compact, no wasted black box inside roster.

---

## Today’s FAIL (your screenshot)

```
┌─ video ~320px cap ─────────┐
│ [1][2][3]  [4][5][6]       │
└────────────────────────────┘
┌─ roster panel flex:1 ──────┐  ← panel grows tall
│ Start/Stop · search        │
│ PP + 2 officers            │
│                            │
│   HUGE EMPTY VOID          │  ← should be VIDEO
│                            │
└────────────────────────────┘
```

**Cause:** `mob-fr-panel-balance-video-roster` capped video at 320px but gave `.ax-fr-watch { flex: 1 1 auto }` — roster **panel** grew; **content** did not → void.

---

## Locked split (from your box)

```
┌─ ax-fr-toolbar ─────────────────────────────────────┐
├─ VIDEO ZONE  flex:1 — grows to black-box bottom ────┤
│  [1]     [2]     [3]                                │
│  [4]     [5]     [6]   equal cells, contain         │
├─ ROSTER BAND  flex:0 — fixed height, no grow ───────┤
│  [Start][Stop][Clear]  meta     [Search][Online]    │
│  ▼ PP · 4/4 online                                  │
│  Chin, kk, … (6 officers) — 7 rows, scroll if more  │
└─────────────────────────────────────────────────────┘
```

| Zone | Flex | Height |
|------|------|--------|
| **Video grid** | `flex: 1 1 0; min-height: 0` | **All space above roster** (~55–60% column) |
| **Roster watch** | `flex: 0 0 auto` | **Content only** — no stretch |
| **Roster wrap** | `flex: 0 0 auto` | `min-height: 210px` (7 rows) · scroll if >7 |

**Not command-wall big** — still one Analytics panel. Box is **~60% column**, not full viewport.

---

## CSS change (from panel-balance)

```css
/* REMOVE video cap */
.ax-fr-grid {
    flex: 1 1 0;
    min-height: 200px;
    /* delete: height: min(34vh, 320px) */
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: repeat(2, minmax(0, 1fr));
    gap: 6px;
}

/* Roster: fixed band — no flex-grow void */
.ax-fr-watch {
    flex: 0 0 auto;
    /* delete: flex 1 1 auto; min-height 240px grow */
}

.ax-fr-roster-wrap {
    flex: 0 0 auto;
    min-height: 210px;
    max-height: 210px;   /* 7 rows; 8+ scrolls inside */
    overflow-y: auto;
}
```

---

## MOB plan

| MOB | Files | Delivers |
|-----|-------|----------|
| **`mob-fr-panel-video-box-split`** | `index.html` CSS only | Video to box line; roster below |
| **Keep** | compact-seven-row chrome, no watchCap, 4-col groups | Unchanged |

**Risk:** Tier **1** — FR CSS only

---

## APPLY

```text
MOB-APPLY mob-fr-panel-video-box-split
```

---

## PASS checkpoint

| # | Check |
|---|--------|
| 1 | Video tiles **taller** — fill area to ~your black-box bottom |
| 2 | **No** huge empty dark band between officers and bottom of panel |
| 3 | Start/Stop + PP + **6 officers** visible below video |
| 4 | All **6 tiles** still on screen |
| 5 | 8th officer / 2nd group → scroll **inside** roster wrap only |

Annotated screenshot = PASS/FAIL enough.

---

## Bottom line

| You drew | We do |
|----------|--------|
| Black box over void | Video `flex:1` into that space |
| Roster below | Roster `flex:0` fixed ~7 rows |
| Getting near | This closes the void gap |
