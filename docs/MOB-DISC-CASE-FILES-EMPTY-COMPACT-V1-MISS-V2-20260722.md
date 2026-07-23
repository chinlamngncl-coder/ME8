# MOB DISC — Case Files empty scroll void: V1 miss, V2 fix

**Status:** V2 APPLIED 2026-07-22 — `MOB-APPLIED-CASE-FILES-EMPTY-COMPACT-V2-20260722.md`  
**Search:** `case files empty scroll`, `still crazy`, `empty compact v1 fail`  
**Trigger:** Operator — empty Case Files still scrolls into blank after V1  
**Genre:** Evidence Hub · Case Files layout

---

## Why V1 still felt crazy

| V1 attempt | Why it failed |
|------------|----------------|
| `cf-list-empty` CSS shrink | **Table + 8-column header stayed in DOM** — `.ss-evidence-table-wrap { overflow: auto }` + flex fill still fought the shrink |
| Panel `min-height: calc(100vh - …)` | Base rule applied **before** empty class; shrink override too weak |
| `#evidence-panel { overflow-y: auto }` | **Outer page scroll** still active — scroll void below compact chrome |
| `panelWarm` skip | Revisiting Case Files tab **skipped `onShow` / `loadList`** — empty class sometimes never re-applied |

Empty list is **not a table problem** — showing an 8-column grid for “No case files yet” is the wrong pattern.

---

## V2 approach (applied)

1. **Hide table + filters** when empty (`display: none` on `#cf-table-wrap.cf-list-empty`, hide filter bar).  
2. **Show compact empty card** (`#cf-empty-state`) — two lines, no scroll shell.  
3. **Panel** only uses viewport fill when **`.cf-list-empty` is absent** (has rows).  
4. **`#evidence-panel.ev-case-files-empty { overflow: hidden }`** — no outer scroll trap.  
5. **`onShow` always runs** — even when `panelWarm`; syncs layout from cache without refetch.

---

## Verify

1. **Ctrl+F5** (JS + CSS changed).  
2. Case Files empty: hints + buttons + small empty card — **no table, no filters, no scroll void**.  
3. **New case file** → filters + table appear; rows compact; many rows scroll inside table.  
4. Switch away and back → still compact if empty.

---

## Ask (done)

**`MOB-APPLY CASE-FILES-EMPTY-COMPACT-V1`** → shipped as **V2** retry on same goal.
