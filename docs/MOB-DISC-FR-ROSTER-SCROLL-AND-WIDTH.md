# MOB DISC — FR roster: scroll behaviour · fix horizontal sprawl

**Status:** DISC 2026-07-11 — feedback after `mob-fr-roster-group-coherent`  
**Trigger:** Roster still **looks too long** (wide empty gap: name left, Tile far right). “If more groups / officers — scroll?”  
**Search:** roster width, scroll, many groups, horizontal gap  
**Next MOB:** `mob-fr-roster-width-compact` — **APPLIED 2026-07-11** (fixed columns, dark scrollbar, no horizontal sprawl)

---

## Plain answer — what happens when fleet grows?

| More of… | What happens **today** |
|----------|-------------------------|
| **More groups** (e.g. 5 map groups) | **5 lines** when collapsed (`▶ North · 6 online`) — **vertical scroll** inside short box (~200px) |
| **Big group expanded** (10–20 officers) | All rows **under that group** — **vertical scroll** in same box |
| **32 in watch** | Same scroll; headers show `N in watch` |
| **Horizontal scroll** | **Should not** happen — but rows **look** wide because table = **100% of wide video column** |

**So yes — mainly vertical scroll inside the roster box.**  
**No — we should not need horizontal scroll** once width is fixed.

---

## Why it still “looks long” (your screenshot)

```
Chin (…0008)  ················· huge empty gap ·················  —
```

| Cause | Fix (next MOB) |
|-------|----------------|
| Table `width: 100%` under **full 6-tile width** | **Cap roster table width** or `table-layout: fixed` |
| **Tile** column pushed to far right | Tile column **narrow right**; name **ellipsis** in middle |
| Officer name column grows to fill | **Max-width** on name; full ID on **hover** only |

**Groups are logical now** — width is a **separate** polish MOB.

---

## Scroll rules (locked — any fleet size)

### Vertical (inside roster box)

| Setting | Value |
|---------|--------|
| Box max-height | **~200px** (~8 lines visible) |
| Overflow | `overflow-y: auto` **inside box only** |
| Page | Video grid + toolbar **do not** scroll away |

### Groups collapsed (default 5+ members)

```
▶ PP · 10 online · 3 in watch
▶ North · 6 online · 0 in watch
▶ South · 4 online · 2 in watch     } scroll inside box
▶ Ungrouped · 3 online · 1 in watch
```

**4 collapsed groups = 4 lines** — fits without scroll.

### One group expanded (10 officers)

```
▼ PP · 10 online · 4 in watch
    Chin (…0008)     Rotate
    kk   (…0009)     Live 2
    … 8 more rows
```

**11 lines** → scroll **inside** roster box; video tiles unchanged.

### Multiple groups expanded

Allowed — scroll inside box. Operator collapses groups they are not using.

---

## Auto behaviour (already in group-coherent)

| Event | Roster |
|-------|--------|
| Search matches officer | That **group expands** |
| Officer **live on tile** | Group **expands** |
| Filter **In watch set** | Groups with selection **expand** |
| User clicks **▼** | Collapse — **selection kept** |

---

## Next MOB — `mob-fr-roster-width-compact` (not applied yet)

| # | Change |
|---|--------|
| 1 | `table-layout: fixed` + column widths (W/P/St tight) |
| 2 | Name column **ellipsis** — no stretch across full grid width |
| 3 | Optional: roster **max-width** ~480px aligned left under tiles |
| 4 | Group meta `2/2 online` stays on **same row** as name — not far right |

**Risk:** Tier **0** — CSS only · no logic change

**Optional later:** roster in **narrow column under snap rail** (Phase 2 sidebar) — video grid taller, roster naturally narrow.

---

## FAQ

**Q: 6 groups × 10 officers — disaster?**  
A: Default **6 collapsed lines**. Open one group at a time; scroll inside box. Same as dispatch tools with collapsible sectors.

**Q: Must I scroll the whole page?**  
A: **No** — only the **small roster panel** scrolls.

**Q: Will horizontal scroll appear?**  
A: **Not intended.** Width MOB removes the empty gap.

**Q: Is group logic wrong again?**  
A: **No** — PP + members stay together. Width is cosmetic.

---

## Bottom line

| Question | Answer |
|----------|--------|
| More groups/officers? | **Vertical scroll** in short roster box |
| Collapsed big groups? | **One line each** — stays short |
| Why still wide? | Table fills **whole tile row width** — fix in `mob-fr-roster-width-compact` |
| APPLY width fix? | Say `MOB-APPLY mob-fr-roster-width-compact` |
