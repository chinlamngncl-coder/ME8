# MOB DISC — Redacted exports Detail: Download / Open source ugly boxes (V1 miss)

**Status:** APPLIED 2026-07-22 — `MOB-APPLIED-REDACTED-EXPORTS-DETAIL-ACTIONS-V2-20260722.md`  
**Mode:** Shipped  
**Search:** `redacted exports detail`, `download open source ugly`, `big row boxes`, `why not fixed`  
**Trigger:** Operator screenshot — 8 exports; Detail column shows **two tall bordered boxes** per row (Download + Open source); rows feel huge  
**Genre:** Evidence Hub · Redacted exports layout

---

## Straight answer — why it still looks ugly

**`REDACTED-EXPORTS-ROW-COMPACT-V1` fixed the wrong half of the problem.**

| What V1 fixed | What V1 missed |
|---------------|----------------|
| Letter-by-letter vertical text (`overflow-wrap: anywhere`) | **Global `.btn { width: 100% }`** on every button |
| Narrower Detail column (18%) | Buttons still render as **full-width bordered blocks** |
| Compact cell padding | Two stacked `width:100%` buttons = **ugly Detail tower per row** |

Your screenshot is the **missed half**: Download and Open source are not inline links — they are **ghost buttons stretched to 100% of the Detail cell**, stacked, with border + padding each.

---

## Root cause (code)

Global Fleet button rule (applies everywhere unless overridden):

```css
.btn { width: 100%; text-align: center; … }
.btn-ghost { border: 1px solid …; }
```

Redacted exports Detail cell renders:

```html
<td class="ev-rx-actions">
  <a class="btn btn-ghost btn-sm">Download</a>
  <button class="btn btn-ghost btn-sm">Open source</button>
</td>
```

`td.ev-rx-actions` is `display: flex; flex-wrap: wrap` — but **each child is still `width: 100%`**, so:

```
┌─ Detail ─────────────┐
│ ┌──────────────────┐ │
│ │    Download      │ │  ← full width box
│ └──────────────────┘ │
│ ┌──────────────────┐ │
│ │   Open source    │ │  ← full width box
│ └──────────────────┘ │
└──────────────────────┘
```

Other Evidence tables override toolbar buttons (`width: auto`) — **Redacted exports table actions were never exempt.**

Secondary (less ugly than buttons, still real):

- `#ev-rx-table-wrap { flex: 1; min-height: 220px }` — table shell fills viewport; with only 8 rows, **empty dark area below** can still scroll (same family as Case Files fill bug).

---

## What operator wants

| Rule | Detail |
|------|--------|
| **One compact row per export** | Height ≈ one line of text + small actions |
| **Download + Open source** | **Inline** — side by side or tight link-style, **not** two full-width boxes |
| **No scroll into blank** | Scroll only when **many rows** exceed viewport |
| **No horizontal scroll-right** | Keep ellipsis on long filenames (V1 OK) |

---

## Recommended MOB

**Name:** `REDACTED-EXPORTS-DETAIL-ACTIONS-V2`

### In scope
1. **Override global btn width** inside redacted exports Detail only:

```css
#ev-panel-redacted-exports .ev-rx-actions .btn,
#ev-panel-redacted-exports .ev-rx-actions a.btn {
    width: auto;
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
}
```

2. **Flex row** on actions: `flex-direction: row; flex-wrap: wrap; gap: 6px; align-items: center` — Download + Open source on **one line** when space allows.  
3. Optional: **link-style** variant (underline, no full border box) for even cleaner row — only if operator prefers after V2 buttons test.  
4. **Table shell**: when row count &lt; viewport (e.g. ≤15), **no flex-grow** on `#ev-rx-table-wrap` — compact like Case Files empty V2 pattern (class from JS or `:has(tbody tr:nth-child(16))`).

### Out of scope
- Changing export data / download API  
- Case Files detail (separate MOB: `CASE-FILES-DETAIL-COMPACT-V1`)  
- Reverting filename ellipsis

### Risk
**Very low** — CSS scoped to `#ev-panel-redacted-exports .ev-rx-actions`.

### Verify

| # | Test | Pass |
|---|------|------|
| 1 | Detail: Download + Open source **small, inline** — not full-width boxes | ☐ |
| 2 | 8 rows visible without giant row height | ☐ |
| 3 | Long filename still ellipsis; no scroll-right | ☐ |
| 4 | Many exports (50+) — scroll inside table only | ☐ |

---

## Why “why can't you solve this?”

V1 targeted **text wrapping** (real bug, fixed). Your screenshot shows the **button width** bug — different selector, same column. One APPLY did not touch `.btn { width: 100% }`. V2 is the missing line.

**Ctrl+F5** after APPLY — CSS in `index.html`.

---

## Ask

**`MOB-APPLY REDACTED-EXPORTS-DETAIL-ACTIONS-V2`**

One APPLY. Do not bundle Case Files detail in same diff.

---

## Related

- V1 (partial): `MOB-APPLIED-REDACTED-EXPORTS-ROW-COMPACT-V1-20260722.md`  
- First giant-row disc: `MOB-DISC-REDACTED-EXPORTS-ROW-GIANT-UGLY-20260722.md`  
- Render: `loadRedactedExports()` in `evidence-hub.js`  
- Global btn: `public/index.html` `.btn { width: 100% }`
