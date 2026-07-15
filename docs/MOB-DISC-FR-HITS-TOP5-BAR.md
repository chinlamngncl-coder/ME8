# MOB DISC — Hits as top row of 5 (not reserve-4of16)

**Status:** **APPLIED then REJECTED (placement)** 2026-07-13 — operator: destroyed UI  
**Correction DISC:** `MOB-DISC-FR-HITS-TOOLBAR-CHIPS.md` — beside Load video, snapshot slot size, Recent 16 restored  
**Do not leave full-width bar** — next APPLY = `mob-fr-hits-toolbar-chips`  
**Heading (operator):** short **Matches** / Subject matches (no long subtitle block)  
**Date:** 2026-07-13  
**Trigger:** Screenshot + “5 on top” — placement later judged too tall / crushed Face desk  
**Supersedes (layout only):** sticky **4-of-16 inside Recent**  
**Keeps:** overflow + Keep → holds DISCs; match-routing intent

---

## Plain answer

**Yes — that top band is usable.** Stacking Hits *inside* the Recent column was the space-safe default when we assumed the column was full. Your screenshot shows spare **horizontal** room across the top of the Face panel (above the 6-tile grid / along the top edge toward the Recent corner).

**Revised desk layout (preferred, not applied):**

| Zone | Count | Role |
|------|-------|------|
| **Watch hits** | **5** thumbs, **left → right** in a top strip | Match-only, sticky |
| **Recent** | **12** (2×6 in right column) | Rolling faces only |
| Overflow | `+N` badge on Hits strip | 6th+ matches |

Do **not** APPLY until you say so. `mob-fr-hits-reserve-4of16` stays **parked**.

---

## Where “5 on top” sits (concrete)

```
Analytics · Face
┌─ toolbar (threshold, Load video, …) ─────────────────────────┐
│  WATCH HITS   [H1][H2][H3][H4][H5]  (+N)                     │  ← NEW strip
├────────────────────────────────────────────┬─────────────────┤
│  6 live tiles (3×2)                        │ RECENT (12)     │
│                                            │ 2×6 grid        │
│  Search officers…                          │ rolling only    │
└────────────────────────────────────────────┴─────────────────┘
```

- **DOM intent:** `#ax-fr-hits-bar` between `.ax-fr-toolbar` and `.ax-fr-main` (full width of Face panel), **or** top of `.ax-fr-main` spanning left+right with Recent starting below the bar’s right end.  
- **Corner feel:** strip aligns so the **rightmost hit** sits above / toward the Recent column header — reads as “hits corner,” not a second Recent pile.  
- **Thumb size:** one row, ~56–72px tall; grade border + score chip on match cards.

**Honest cost:** that row takes ~56–72px from the tile column height (tiles flex). It does **not** fight the 16-fit scroll war. Reducing Recent **16 → 12** frees vertical in the rail so 2×6 still fills the column cleanly under the new top bar.

---

## Why this beats reserve-4of16 (for your ask)

| | Reserve 4 of 16 | Top row of 5 |
|--|-----------------|--------------|
| Recent capacity | 12 mixed in same grid | **12 pure rolling** |
| Hits visible | 4 | **5** |
| Operator scan | Hunt top of rail | Eye-line **above tiles** |
| Mix match + faces in one grid | Yes (confusing) | **No** |

Overflow rules unchanged: priority bump, queue, ledger, Keep → holds — only sticky window size is **5** instead of **4**.

---

## Empty space caveat

The dark band in the screenshot is partly:

- unused height when the **3×2 tile grid** isn’t packed with live video, and/or  
- gap under the Analytics chrome / toolbar  

When **all 6 tiles are live**, the band shrinks — Hits bar must be a **fixed flex-shrink: 0** row, not “only if empty.” Lab check: Start watch on several cams and confirm tiles still usable.

---

## MOB ids (updated)

| MOB | Status |
|-----|--------|
| `mob-fr-hits-reserve-4of16` | **Parked** — don’t APPLY first |
| **`mob-fr-hits-top5-bar`** | Preferred layout — 5 L→R top + Recent 12 |
| `mob-fr-hits-overflow-queue` | Still needed (`+N`, priority) — sticky cap = 5 |
| `mob-fr-hit-keep-to-holds` | Keep from bar or overflow |

---

## Apply cheatsheet (only when you say)

```text
MOB-APPLY mob-fr-hits-top5-bar
MOB-APPLY mob-fr-hits-overflow-queue
MOB-APPLY mob-fr-hit-keep-to-holds
```

---

## Bottom line

| Question | Answer |
|----------|--------|
| Space on top? | **Yes** — use a **5-hit horizontal bar** |
| Keep Recent 12? | **Yes** — rolling only, right column |
| APPLY reserve-4of16? | **No** — parked per you |
| >5 hits? | Same overflow DISC, cap sticky = 5 |
