# MOB DISC — `mob-fr-snap-rail-proportion-grid`

**Status:** **APPLIED** 2026-07-10  
**Date:** 2026-07-10  
**Search:** snapshot rail, 8 tiles, proportion, thumb, click enlarge, layout  
**Related:** `mob-fr-snap-rail-scene-display` (APPLIED), `MOB-DISC-FR-ALERT-UX-SOP-INDUSTRY-SOS-PARITY.md`

---

## Operator ask (locked)

> Shape the size — show **fully**, layout **small**, **click** to go big. **Total 8**, design in **proportion**.

**Meaning:** Rail = compact **contact sheet**; lightbox = detail. Not 8 tall strips eating the column.

---

## Today vs target

| | Today (scene-display) | Target |
|--|----------------------|--------|
| Rail | 1 column × 8 rows @ **160px** tall | **2×4 grid**, fixed proportion cells |
| Fit | `contain` ✓ | `contain` ✓ |
| Enlarge | Click lightbox ✓ | Keep ✓ |
| Count | 8 max ✓ | **Always 8 slots** (filled or empty placeholder) |
| Column | 240px `ax-fr-right` | Same width — no layout reflow of live grid |

---

## Locked layout spec

```
┌─ SNAPSHOT (8) ─────────┐
│ ┌────┐ ┌────┐  row 1   │
│ │ 1  │ │ 2  │          │
│ └────┘ └────┘          │
│ ┌────┐ ┌────┐  row 2   │
│ │ 3  │ │ 4  │          │
│ └────┘ └────┘          │
│   … rows 3–4 (8 total) │
└────────────────────────┘
     click any → lightbox
```

| Rule | Value |
|------|--------|
| Grid | **2 columns × 4 rows** |
| Cap | **8** snaps (newest first, left→right, top→bottom) |
| Cell aspect | **`4:3`** landscape (scene context; face not cropped by CSS) |
| Cell width | ~50% of rail minus gap (~**108px** in 240px column) |
| Cell height | From aspect-ratio — ~**81px** at 4:3 (not fixed 160px) |
| Image | `width/height 100%`, **`object-fit: contain`**, dark letterbox |
| Match | Red border (existing `.is-match`) |
| Empty slot | Muted placeholder `—` (optional dashed border) — keeps grid stable |
| Scroll | Rail fits **~8 thumbs without scroll** on typical laptop (target ≤360px rail height) |
| Lightbox | Unchanged — max ~920px wide, `contain` |

**Sidecar:** No change — `scene` / `full_face` crops stay; this MOB is **CSS + rail DOM only**.

---

## APPLY scope (one MOB)

| File | Change |
|------|--------|
| `public/index.html` | CSS: `.ax-fr-crop-list` → `display: grid; grid-template-columns: 1fr 1fr; gap: 6px`; `.ax-fr-crop-card` → `aspect-ratio: 4/3`; reduce img height rule to `height: 100%` |
| `public/js/fr-alarm.js` | `pushCrop`: maintain 8 slots; optional empty placeholder cells; insert order newest top-left |

**Not in this MOB:** sidecar, ledger, alarm modal, map parity.

---

## APPLY command

```text
MOB-APPLY mob-fr-snap-rail-proportion-grid
```

---

## Mini test

1. Hard refresh  
2. FR watch → rail shows **8 proportional thumbs** in **2×4** grid, full image in frame  
3. Click → lightbox big  
4. Match tile → red border  

PASS/FAIL only.

---

## Rejected

| Idea | Why |
|------|-----|
| Back to `object-fit: cover` | Chops face (operator FAIL) |
| 1×8 tall column | Wastes vertical space |
| &gt;8 on rail | Operator locked **total 8** |
| Resize `ax-fr-right` wider | Steals space from live 4-tile grid |
