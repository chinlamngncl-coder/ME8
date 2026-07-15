# MOB DISC — Hits placement: no free space above 16 Recent

**Status:** DISC locked 2026-07-13 — **layout superseded for preference**  
**Operator 2026-07-13:** prefer **5 Hits L→R on top** + Recent 12 — see `MOB-DISC-FR-HITS-TOP5-BAR.md`. **Do not APPLY** `mob-fr-hits-reserve-4of16` first.  
**Overflow AGREE still stands:** `MOB-DISC-FR-HITS-OVERFLOW-GT4.md` (sticky window becomes **5** if top5-bar lands).  
**Date:** 2026-07-13  
**Trigger:** “Above Recent — have you even thought is there anymore space? We have 16 recent polling.”  
**Corrects:** `MOB-DISC-FR-HITS-PLACEMENT-INVESTIGATION-LINK.md` § Placement (stacked strip was naive)  
**Related:** `mob-fr-snap-rail-16-fit` (APPLIED — 16 slots fill column, **no scroll**)  
**Overflow:** `MOB-DISC-FR-HITS-OVERFLOW-GT4.md`

---

## Honest correction

**You are right.** Stacking a second Hits strip **above** Recent was a desk sketch that ignored the layout we already locked.

Facts on screen today:

| Constraint | Value |
|------------|--------|
| Right column width | **~240px** (`.ax-fr-right`) |
| Recent slots | **16**, 2×8 grid |
| Fit rule | `mob-fr-snap-rail-16-fit` — thumbs **fill the column**; `overflow: hidden`; **no scrollbar** |
| Polling | Rolling `fr-crop-tick` feeds those 16 |

There is **no spare vertical band** left in that column for “4–6 more cards on top” without:

- crushing Recent below readability, or  
- bringing back scroll (explicitly rejected), or  
- shrinking the 6 live tiles

So: **do not APPLY “Hits above Recent” as an extra strip.** That proposal is **withdrawn**.

---

## What still must be true

Quiet grades still need a home rolling cannot erase. Space forces **reuse of the same 240px column** (or leave the column entirely).

---

## Options that fit real space

### A — Reserve slots inside the 16 (recommended)

Same grid. **Top 4 cells = Watch hits only** (sticky). Bottom **12 = Recent** rolling.

```
┌─────────────┐
│ H1  H2      │  ← match-only; rolling must not shift these
│ H3  H4      │
│ r1  r2      │
│ …   …       │  ← 12 recent FIFO
│ r11 r12     │
└─────────────┘
```

| Pros | Cons |
|------|------|
| Zero new chrome; keeps 16-fit / no scroll | Fewer recent faces (12 vs 16) |
| Hits always visible while watching | Hit overflow → queue badge / replace oldest hit |

**Investigation link:** Keep on hit cell → holds (unchanged).

---

### B — Toggle same column (Recent | Hits)

Header control: **Recent** ↔ **Hits**. One footprint, full 16 for whichever mode.

| Pros | Cons |
|------|------|
| Full 16 for faces when needed | Hits hidden until you switch — easy to miss POI |
| No layout fight | Needs badge count on tab when Hits > 0 |

Good as **secondary** if A feels too cramped.

---

### C — Do not put Hits in the rail column

Live: toast/amber (suspect+) only; POI/monitoring → **snap ledger** + Evidence later.  
Rail stays 16 Recent forever.

| Pros | Cons |
|------|------|
| Zero space fight | Contradicts “quiet grades must be visible while watching” |
| | Operators must leave Face desk to see POI |

**Reject as sole home** for POI/monitoring. OK as archive only.

---

### D — Horizontal strip under the 6 tiles (left column)

Hits as a **single row** under the tile grid (not in the 240px rail).

| Pros | Cons |
|------|------|
| Rail 16 untouched | Steals height from tiles / watch list |
| | Another layout fight with 6-tile priority |

Park unless A fails lab soak.

---

## Locked direction (space-honest)

**Primary: Option A — reserve 4 of 16 for Hits; 12 for Recent.**

- No second strip above Recent  
- No scroll regression  
- Same column, same 16-fit contract  
- Rolling `pushCrop` only rotates slots **4–15** (or 5–16); slots **0–3** accept match cards only  

**Fallback:** Option B toggle if 12 recent is too few in lab.

**Overflow when matches > 4:** `MOB-DISC-FR-HITS-OVERFLOW-GT4.md` (queue + ledger; not dumped into Recent).

**Withdrawn:** Extra Hits strip stacked above Recent.

---

## MOB rename / scope

| Old sketch | Space-honest MOB |
|------------|------------------|
| `mob-fr-hits-strip-pin` (extra strip) | **`mob-fr-hits-reserve-4of16`** — pin top 4 slots; rolling uses 12 |

Keep: `mob-fr-hit-keep-to-holds` (Keep → Investigation) — independent of layout.

---

## Apply cheatsheet (when ready)

```text
MOB-APPLY mob-fr-hits-reserve-4of16
MOB-APPLY mob-fr-hit-keep-to-holds
```

---

## Bottom line

| Question | Answer |
|----------|--------|
| Space above Recent? | **No** — 16-fit already owns the column |
| Still need Hits home? | **Yes** — inside the 16 (reserve), or toggle |
| Stacked strip? | **Wrong** — corrected here |
