# MOB DISC — Matches chips = Recent snap size · drop redundant Analytics title

**Status:** **APPLIED 2026-07-13** — `mob-fr-matches-chip-snap-size` · **CHECKPOINT PASS** (operator: keep like this for now)  
**Date:** 2026-07-13  
**Trigger:** Screenshot FAIL — “take Analytics word out… make space up… boxes so small… same size as snap slot… listening? MOB Disc”  
**Corrects:** `mob-fr-hits-toolbar-chips` used **44×44** chips (too small). Operator asked for **Recent snap-slot size**.

**Shipped:** hide `#analytics-panel > h2`; chip size measured from Recent snap cell (fallback ~104×72, clamped).  
**Parked until asked:** overflow panel, Keep-from-chip, amber toast by grade.

---

## Honest admission

You did say **same size as snap slot**. We shipped **44px** toolbar chips. That is **not** a Recent snap cell. You are right to call that out.

Recent column (`.ax-fr-right` ~240px, 2×8 grid) → each snap is roughly **~100–110px wide** and **~50–70px+ tall** (fills rail row). Toolbar chips at 44px read as decoration dashes, not forensic thumbs.

---

## Two fixes (one MOB when you APPLY)

### 1) Remove top-left **Analytics** heading

| Element | Action |
|---------|--------|
| `#analytics-panel > h2` (“Analytics”) | **Hide / remove** in main desk |
| Top nav tab **Analytics** | Keep — already names the page |

Popout already hides this h2. Main desk should match: no repeat title → **vertical space back** for larger Matches chips / tiles.

### 2) Matches chips = Recent snap slot size

| | Wrong (now) | Locked target |
|--|-------------|----------------|
| Chip size | 44×44 | **Same visual size as one `#ax-fr-crop-rail` snap card** |
| How | Hardcoded px | Measure/match Recent cell (or CSS ~**100×** row-height, min **72×72**) |
| Label | Short **Matches** | Keep short — no long subtitle |

**Still:** far-right toolbar · 5 sticky · Recent stays 16 · match routing unchanged.

Toolbar may become **taller** (one thumb-height). That is intentional — space comes from killing the Analytics h2, not from crushing tiles again.

---

## Reject

| Idea | Why |
|------|-----|
| Keep 44px “cute” chips | Operator rejected — unusable for faces |
| Full-width Subject matches strip | Already rejected |
| Shrink Recent to fund chips | Rest of UI stays |

---

## MOB (when you say APPLY)

```text
MOB-APPLY mob-fr-matches-chip-snap-size
```

Delivers in **one** pass (space + size are one goal):

1. Hide `#analytics-panel > h2`  
2. Size `#ax-fr-hits-list` cards to **Recent snap slot** dimensions (not 44px)  
3. Keep far-right toolbar placement + **Matches** label  

---

## Bottom line

| Ask | Answer |
|-----|--------|
| Drop “Analytics” title? | **Yes** — tab is enough; frees space |
| Chip size? | **= Recent snap slot**, not 44px — prior APPLY was wrong |
| Listening? | Corrected here in DISC; code waits for your APPLY |
