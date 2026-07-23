# MOB DISC — Redacted exports: giant rows, vertical Download letters (FILL-LAYOUT regression)

**Status:** APPLIED 2026-07-22 — `MOB-APPLIED-REDACTED-EXPORTS-ROW-COMPACT-V1-20260722.md`  
**Search:** `redacted exports ugly`, `huge rows`, `download vertical`, `fill layout`, `scroll left right`  
**Trigger:** Operator screenshot — 8 exports, **2 visible**, Detail column stacks **Download / Open source** letter-by-letter, rows hundreds of px tall  
**Genre:** Evidence Hub · Redacted exports layout

---

## Straight answer — what went wrong

`REDACTED-EXPORTS-FILL-LAYOUT-V1` fixed **horizontal scroll** but introduced **worst-case row height**:

| Symptom | Cause |
|---------|--------|
| **Download** / **Open source** stacked vertically (one letter per line) | `overflow-wrap: anywhere` on **all** `td` cells, including Detail actions |
| Rows taller than the screen | Narrow Detail column (13%) + broken button text → cell height explodes → whole row stretches |
| Only ~2 of 8 exports visible | Row height bug, not missing data |
| Feels “huge and ugly” | Valid — layout broke action column |

**Not** a data problem. All 8 exports are there.

---

## What operator wants (correct product bar)

| Rule | Meaning |
|------|---------|
| **Compact rows** | One normal-height row per export |
| **No horizontal scroll** | Columns fit width; long names ellipsis |
| **Vertical scroll only when many rows** | Table area fills page; scroll inside list when stack grows |
| **Few rows** | No giant empty row boxes — dark fill below rows is OK, not stretched cells |

Same family as Case Files empty void — **fill container ≠ stretch each row**.

---

## Fix applied — `REDACTED-EXPORTS-ROW-COMPACT-V1`

1. **Detail column exempt** from `overflow-wrap: anywhere` — actions stay horizontal.  
2. **Wider Detail** (13% → 18%) — room for Download + Open source.  
3. **Compact padding** — `6px 8px`, normal line-height.  
4. **Filename / source** — single-line ellipsis (hover title keeps full name).  
5. Keep fill-layout shell (no sideways scroll); rows stay short.

---

## Verify

1. **Ctrl+F5** (CSS in `index.html` — no server restart).  
2. Evidence → **Redacted exports**.  
3. Each row ≈ one line tall; Download + Open source side by side.  
4. 8 exports: most/all visible without giant rows; scroll only if list exceeds viewport.  
5. No scroll-right into blank.

---

## Related

- Prior fill MOB: `MOB-APPLIED-REDACTED-EXPORTS-FILL-LAYOUT-V1-20260722.md`  
- Case Files empty void (same fill mistake): `MOB-DISC-CASE-FILES-EMPTY-SCROLL-VOID-20260722.md`
