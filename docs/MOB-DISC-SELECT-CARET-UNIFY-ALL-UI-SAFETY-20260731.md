# MOB DISC — SELECT-CARET-UNIFY-ALL-UI-V1 safety lock (last-moment)

**Date:** 2026-07-31  
**Status:** Safety disc + APPLY of `SELECT-CARET-UNIFY-ALL-UI-V1`  
**Operator order:** Unify caret everywhere — **do not destroy** selects / inputs. Double-check. Last moment.

---

## Hard FAIL if any of these happen

1. Click on dropdown **does nothing** / cannot open list  
2. Arrow sits on top and **steals clicks**  
3. Select / option values break, change handlers die  
4. Forms cannot save because control is covered or removed  
5. Infinite DOM wrap loop / UI freeze  
6. Full-width ugly bars return  

If any of the above → **revert this MOB immediately**. Do not “polish.”

---

## Locked safe method (only this)

| Rule | Why |
|------|-----|
| Keep native `<select>` — **no** custom JS dropdown / fake list | Fake lists break keyboard, forms, focus |
| Move existing `<select>` into `.ax-select-wrap` — **same DOM node** | Listeners, `id`, `name`, `data-*` stay on the element |
| Caret = `::after` only with **`pointer-events: none !important`** | Arrow never eats clicks — click goes to select |
| Select stays **above** for hit-testing (`z-index` on select ≥ caret paint) | Click always hits select |
| Skip: `[multiple]`, `size>1`, `[hidden]`, `aria-hidden="true"`, already wrapped | No double-wrap / broken multi |
| MutationObserver with **re-entry guard** | Wrap must not loop forever |
| Do **not** wrap `input` / textarea / buttons | Scope = single-choice select only |
| Do **not** change select `id` / options / i18n | Zero behaviour change |

---

## Verify before operator PASS (agent)

1. Code review: every caret rule has `pointer-events: none`  
2. Grep: no full-size overlay `div` on top of select without `pointer-events: none`  
3. After load: click Ops fleet filter + Settings one select + Plate lists grade — all **open**  
4. No console spam / freeze from observer  

Operator: hard refresh → click several dropdowns → list must open every time + ▼ visible.

---

## APPLY

`MOB-APPLY SELECT-CARET-UNIFY-ALL-UI-V1` under these locks only.
