# MOB DISC — “global is not defined” on Centre Summary

**Status:** **APPLIED** 2026-07-09 — `global` → IIFE `(window)`; `showError` uses `opMsg`.

---

## What you saw

Red banner on **Centre Summary:** `global is not defined`

**This is NOT:**
- Your login account `global`
- A license or permission problem
- A name we chose for the product

**This IS:**
- A **JavaScript programming mistake** in our code
- The browser error text **printed on screen** — same zero-tolerance class as `Unexpected token '<' … JSON`

---

## Cause (one line)

`public/js/command-centre.js` uses `global.TabLifecycle` but the file never defines `global` in the browser (only Node.js has `global` by default).

After Centre Summary **successfully loads data**, line 558 runs:

```javascript
if (global.TabLifecycle) TabLifecycle.markLoaded('centre-summary');
```

→ throws **ReferenceError: global is not defined**  
→ catch block shows `err.message` in the red banner.

So the page may have loaded API data, then **crashed on the last line** and showed developer text.

---

## Locked rules (same as JSON leak)

| Never show | Always show |
|------------|-------------|
| `global is not defined` | `errors.generic` or `centre.error.load` |
| `err.message` in banners | `OperatorUI` / `opMsg` |

---

## Fix MOB (one apply, risk 1)

**Name:** `mob-centre-summary-global-ref-fix`  
**Can bundle with:** `mob-ui-zero-raw-api-errors` (same genre: no raw errors)

1. `command-centre.js` lines 528, 558: `global` → `window` (or IIFE `(function (global) { … })(window)`).
2. `showError()`: use `opMsg` — never raw `err.message`.
3. Cache-bust `command-centre.js`.
4. Bench: Centre Summary → **no red banner**; KPI/chart visible.

**Not related to:** A5 naming, Display layout, SOS preset rename.

---

## Apply

`MOB-APPLY mob-centre-summary-global-ref-fix`
