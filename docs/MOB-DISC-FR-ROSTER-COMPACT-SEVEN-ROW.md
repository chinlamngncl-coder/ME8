# MOB DISC — FR roster compact · search up · drop repeat · 7-row group unit

**Status:** **APPLIED 2026-07-11** — `mob-fr-roster-compact-seven-row`  
**Search:** officer search, compact, 7 rows, group header, repeat 32 6 live, fill space  
**APPLY name:** `mob-fr-roster-compact-seven-row`  
**Related:** `MOB-DISC-FR-ROSTER-GROUP-GRID.md`, `MOB-DISC-FR-TILE-GRID-FIT-SIX.md`

---

## Plain answer

**Yes — your logic is correct.**

| Unit | Rows |
|------|------|
| 1 group header | ▼ ☑ ● **PP** · 4/4 online |
| 6 officers (typical BWC group) | checkbox + name + tile badge × 6 |
| **Total** | **7 rows** — one compact block |

Search goes **up on the same band** as Start/Stop. Remove **repeated** “Max 32 · 6 live · rotate 20s”. Roster band is **content height**, not stretched to fill — **leftover space goes to video**, not empty roster void.

---

## What your screenshots show (FAIL)

1. **Search on its own fat row** — full width, feels like a form page not ops chrome  
2. **“Max 32 · 6 live · rotate 20s”** — third copy of the same facts  
3. **PP + 2 officers** in a tall box with **huge empty area below** — roster wrap forced tall, content tiny  

---

## Triple repeat (remove one)

| Where | Text | Keep? |
|-------|------|-------|
| Top toolbar | `6 live tiles · up to 32 in watch set · rotate ~20s` | **Yes** — once at panel top |
| Watch bar | `0/32 selected · 0/6 live · 1 groups` | **Yes** — live status |
| Watch bar | `Max 32 · 6 live · rotate 20s` | **Remove** — duplicate |

**Delete** `analytics.fr.watchCap` span from `renderWatchList()` (line ~710). Key can stay in `en.json` unused or removed later.

---

## Locked layout — compact roster band

### Wireframe (one group, 6 officers — lab norm)

```
┌─ ax-fr-watch  height = content, NOT flex-fill ─────────────────────────┐
│ [Start][Stop][Clear]  0/32 · 0/6 live · 1 groups   [Search…][Online▼] │  ← ONE row
├────────────────────────────────────────────────────────────────────────┤
│ ▼ ☑ ● PP                                    4/4 online                 │  row 1
│   ☐ ● Chin (3402…0008)                                              —  │  row 2
│   ☐ ● kk   (3402…0009)                                              —  │  row 3
│   … up to 6 officers when group expanded                               │  rows 4–7
└────────────────────────────────────────────────────────────────────────┘
     ~7 rows × ~22px + header ≈ 170px — no void below
```

### Row budget (locked)

| Element | Height |
|---------|--------|
| Watch chrome row (buttons + meta + search) | **~32px** single line |
| Group card header | **26px** |
| Officer row | **22px** each |
| **1 group + 6 officers** | **26 + 6×22 = 158px** + 12px padding ≈ **170px** |
| Roster wrap `max-height` | **~190px** (7 rows) then scroll |
| Multi-group | 4-col grid **unchanged** — each card same 7-row cap |

---

## Theme rule — don’t fill empty space

| Wrong (today) | Right |
|---------------|-------|
| `.ax-fr-watch { flex: 0 0 240px }` fixed tall band | `flex: 0 0 auto` — **as tall as content** |
| `.ax-fr-roster-wrap { flex: 1 }` stretches empty | `flex: 0 0 auto; max-height: 190px` |
| Search `grid 1fr + 108px` on **own row** | Search **inline** on watch bar, `max-width: 200px` |
| Leftover column height → roster void | Leftover → **video grid above** (already `flex: 1`) |

**Enterprise pattern:** chrome is **tight**; data area is **exact rows**; scroll only when >7 lines or >4 groups.

---

## MOB plan

| MOB | Files | Delivers |
|-----|-------|----------|
| **`mob-fr-roster-compact-seven-row`** | `fr-live-watch.js`, `index.html` CSS | One-row chrome, no watchCap, 7-row roster |
| **Not** | group grid logic, expand/collapse, 32 cap | Unchanged |
| **Not** | video tile MOB | Unchanged |

### `fr-live-watch.js`

1. **Remove** `<span class="hint">` with `analytics.fr.watchCap`  
2. **Merge** toolbar into watch bar — one `ax-fr-watch-bar` row:
   - Left: actions  
   - Center: `rosterMeta`  
   - Right: search + filter (compact)  
3. Drop separate `ax-fr-roster-toolbar` div (or make it `display: contents`)

### `index.html` CSS

```css
.ax-fr-watch { flex: 0 0 auto; /* not 240px fixed */ }
.ax-fr-watch-bar {
    display: flex; flex-wrap: nowrap; align-items: center; gap: 6px 8px;
    margin-bottom: 6px;
}
.ax-fr-roster-search { max-width: 200px; padding: 5px 8px; font-size: 10px; }
.ax-fr-roster-filter { width: 88px; padding: 4px 6px; font-size: 10px; }
.ax-fr-roster-wrap {
    flex: 0 0 auto;
    max-height: 190px;
    /* remove min-height stretch */
}
```

---

## 7 rows — when it applies

| Fleet shape | UI |
|-------------|-----|
| **1 group, ≤6 officers** (lab PP) | One card, expanded, **7 rows visible, no scroll** |
| **1 group, 8 officers** | 7 visible + scroll inside card OR whole wrap |
| **4 groups collapsed** | 4-col grid, **1 row each** — still compact |
| **4 groups, one expanded 6** | That card = 7 rows; others stay 1-line headers |

**Your “1 group icon + 6 officers” = the logical selection unit.** Multi-group grid stays for sectors; compact height is per card.

---

## APPLY

```text
MOB-APPLY mob-fr-roster-compact-seven-row
```

---

## PASS checkpoint

Hard refresh → Analytics → Face recognition:

| # | Check |
|---|--------|
| 1 | **No** “Max 32 · 6 live · rotate 20s” in roster band |
| 2 | Search + Online filter **same row** as Start/Stop (right side) |
| 3 | PP expanded: **header + officers** — **no big empty box** below 2 officers |
| 4 | ~**7 rows** fit without wasted vertical space |
| 5 | **More room for video** above (roster not stealing height) |
| 6 | Top toolbar hint still says 6 tiles / 32 watch once |

Screenshot = enough.

---

## FAQ

**Q: Lose 4-column group grid?**  
A: **No** — only chrome + height. Multiple groups still in columns when fleet has sectors.

**Q: Why 7 not 8?**  
A: 6 officers is your norm; 8th row scrolls inside wrap. Cap `max-height` at ~190px (= 7 rows).

**Q: Why search not full width?**  
A: Theme uses **inline ops controls** — not a search-first web form. Full width ate a row for no gain.

---

## Bottom line

| You said | Plan |
|----------|------|
| Search up | **One row** with buttons + meta + search |
| Drop repeat 32/6/live | **Remove watchCap** |
| Don’t fill all space | **Content-height roster**; video gets the rest |
| 7 rows logical | **1 header + 6 officers** — locked row budget |
| MOB | `mob-fr-roster-compact-seven-row` |
