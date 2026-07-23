# MOB DISC — Case Files empty list: pointless scroll void (still open)

**Status:** APPLIED V2 2026-07-22 — `MOB-APPLIED-CASE-FILES-EMPTY-COMPACT-V2-20260722.md` (V1 operator FAIL — see `MOB-DISC-CASE-FILES-EMPTY-COMPACT-V1-MISS-V2-20260722.md`)  
**Mode:** Shipped  
**Search:** `case files empty`, `scroll void`, `so empty`, `unnecessary scroll`, `fill layout fail`  
**Trigger:** Operator screenshot — empty Case Files, hints visible, **big dark box + scroll down into nothing**  
**Genre:** Evidence Hub · Case Files layout (not purpose / not redact)

---

## What happened (Cursor restart)

Yes — **Cursor restarted** and the chat handoff continued. Your work was **not lost**:

| MOB | Status |
|-----|--------|
| `CASE-FILES-PURPOSE-HINT-V1` | **APPLIED** — two hint lines at top (visible in your shot) |
| `CASE-FILES-FILL-LAYOUT-V1` | **APPLIED** — but **wrong target for empty list** (see below) |

So: purpose copy landed. **Empty scroll waste did not.**

---

## Straight answer — why it still feels broken

**The page is empty on purpose** (no cases created yet). That part is normal.

**The layout is not normal:** you get a **full-height dark table shell** with only one line (“No case files yet”) and **vertical scroll into blank** — that is a **real bug**, not missing data.

| What you see | Meaning |
|--------------|---------|
| “No case files yet” | Correct — nobody clicked **New case file** or **Create from SOS** |
| Huge dark area below | **CSS bug** — table wrapper forced to fill viewport |
| Scroll down → nothing | **CSS bug** — `overflow-y: auto` on an empty flex-grow box |

There are **no hidden case files** off-screen.

---

## Root cause (why FILL-LAYOUT made empty worse)

`CASE-FILES-FILL-LAYOUT-V1` copied the **Redacted exports** pattern:

```css
#ev-panel-case-files { min-height: calc(100vh - 168px); … flex column }
#cf-table-wrap { flex: 1 1 auto; min-height: 220px; overflow-y: auto; }
```

That pattern is fine when the list **has many rows** (scroll inside the table).  
When the list is **empty**, it **stretches an empty box to nearly full screen** → operator scrolls into void.

Original disc verify line “List box fills down the page” was **misread as success** — for **empty** Case Files, **compact** wins, not **fill**.

```
Chrome (hints, buttons, filters)
┌─────────────────────────────┐
│ No case files yet           │  ← 1 row of content
│                             │
│                             │  ← flex:1 forces this void
│         (scroll here)       │
│                             │
└─────────────────────────────┘
```

Also: `#evidence-panel { overflow-y: auto }` can stack with inner scroll → **double scroll feel**.

---

## What FILL-LAYOUT did fix (keep)

- Horizontal scroll-right on wide columns — **likely OK now**
- `table-layout: fixed`, wrapped actions — keep for when rows exist

Do **not** revert those; fix **empty-state height behaviour** only.

---

## Recommended next MOB

**Name:** `CASE-FILES-EMPTY-COMPACT-V1`

### In scope
1. **Empty list:** `#cf-table-wrap` **shrinks to content** — no flex-grow, no `min-height: 220px` when tbody is empty-only.  
2. **Has rows:** keep fill + internal scroll when many cases (same as Redacted exports with data).  
3. Toggle via CSS class from `case-files-ui.js` (e.g. `cf-table-wrap cf-list-empty`) or `:has(.cf-empty-row)` if safe.  
4. Optional: nicer empty row — short centered block + repeat **New case file** / **Create from SOS** links (no full-width table graveyard).  
5. Panel `min-height: calc(100vh - …)` **off or reduced** when empty so Evidence panel does not force page scroll.

### Out of scope
- Auto-create case on SOS Ack  
- Redacted exports / Prior exports  
- Fake placeholder rows  

### Risk
**Low** — CSS + one class toggle in list render.

### Verify (when APPLIED)

| # | Test | Pass |
|---|------|------|
| 1 | Empty Case Files: **no** scroll into blank dark void | ☐ |
| 2 | Page height ≈ hints + toolbar + filters + one empty message (compact) | ☐ |
| 3 | After **New case file**: table grows; many rows scroll **inside** table area | ☐ |
| 4 | No horizontal scroll-right regression | ☐ |

---

## Ask

**`MOB-APPLY CASE-FILES-EMPTY-COMPACT-V1`**

One APPLY — empty compact only. Do not bundle with redact or Case Files create flow changes.

---

## Related

- Prior disc (purpose + original scroll): `MOB-DISC-CASE-FILES-PURPOSE-SOS-ACK-EMPTY-SCROLL-20260722.md`  
- Fill layout (partial): `MOB-APPLIED-CASE-FILES-FILL-LAYOUT-V1-20260722.md`  
- Purpose hint (done): `MOB-APPLIED-CASE-FILES-PURPOSE-HINT-V1-20260722.md`  
- Code: `#ev-panel-case-files`, `#cf-table-wrap` in `public/index.html`; `case-files-ui.js` list render
