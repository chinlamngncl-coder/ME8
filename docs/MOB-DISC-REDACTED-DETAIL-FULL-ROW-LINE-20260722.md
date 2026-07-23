# MOB DISC — Redacted Detail: join lines full width to the right end

**Status:** APPLIED 2026-07-22 — awaiting operator PASS/FAIL  
**APPLY:** `MOB-APPLY REDACTED-DETAIL-FULL-ROW-LINE-V1`

---

## Understand (locked — plain English)

| Your words | Meaning |
|------------|---------|
| “join the lines” | One continuous horizontal rule across **When → Detail → right edge** (no gap / no short stub) |
| “align” / “align right” | The line lines up with the table’s **right border**, same as the outer frame |
| Red stroke you drew | Detail’s separator continues through the empty space past Open source, **to the end** |

```
When              Detail
─────────────+─────────────────────────────────────────────  ← one joined line
22/07/...    | Download                              Open source
─────────────+─────────────────────────────────────────────  ← to RIGHT ENDING
22/07/...    | Download                              Open source
─────────────+─────────────────────────────────────────────
```

**Not:** a short line that ends under the word Open source with blank to the right.

---

## Why the last APPLY still failed

`display: flex` was put on the **`td.ev-rx-actions` itself**.  
In tables, that often **shrinks the cell to content width**. Bottom border then only paints as wide as the links → looks like the line “stops at Open source.”

**Fix (one MOB):** keep `td` as a normal full-width table cell (border across full column). Put flex **inside** a 100%-wide wrapper:

```html
<td class="ev-rx-actions">
  <div class="ev-rx-actions-inner">Download … Open source</div>
</td>
```

```css
td.ev-rx-actions { /* normal cell — border-bottom spans FULL cell width */ }
.ev-rx-actions-inner { display:flex; width:100%; justify-content:space-between; }
```

Also ensure the table is `width: 100%` of the wrap so the right ending = panel edge.

---

## Recommended MOB

**Name:** `REDACTED-DETAIL-FULL-ROW-LINE-V1`

### In scope
1. Inner wrapper for Detail links (stop flex-on-`td`).  
2. Cell/row bottom border runs **full width to the right ending**.  
3. Download left / Open source right (keep).  
4. No box-in-box (keep).

### Out of scope
- VC Live/Lobby, Fit pins, other hubs  

### Risk
**Low** — Redacted exports CSS/HTML only.

### PASS
| # | Look |
|---|------|
| 1 | Horizontal line under each row reaches the **right border** of the table |
| 2 | When-column line and Detail line **join** (one stroke) |
| 3 | Download left, Open source right |
| 4 | No mini box around the links |

---

## APPLY phrase

**`MOB-APPLY REDACTED-DETAIL-FULL-ROW-LINE-V1`**

Until then: disc only.
