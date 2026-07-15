# MOB DISC — FR roster: groups of 6 · 10 · 32 · expand/collapse (enterprise)

**Status:** DISC 2026-07-11 — **`mob-fr-roster-group-coherent` APPLIED**  
**Trigger:** Dual-column split was wrong; design must work for **PP with 2, 6, 10, or 20** BWCs — not lab-only  
**Search:** group expand, collapse, 6 members, 10 members, roster logical, watch set 32  
**APPLY name:** `mob-fr-roster-group-coherent`

---

## Plain answer to “what if group has 6 or 10?”

**We do not split the group across columns or screens.**  
**One group = one block.** Small groups stay open; large groups **collapse** to one summary line until the operator **expands**.

| Group size (online in filter) | Default | Operator sees |
|------------------------------|---------|----------------|
| **1–4** members | **Expanded** | All members listed under header |
| **5–8** members | **Collapsed** | `▶ PP · 6 online · 0 in watch` |
| **9+** members | **Collapsed** | Same — one line per group |

**Expand** = click **▶** (or group name) → members slide open **under that header only** — up to 10, 20, whatever is in the group. Scroll inside the roster box if the open list is long.

**Collapse** = click **▼** → members hide; **watch checkboxes stay** — selection is not lost.

---

## What went wrong (v1 dual column)

Row-count split **ignored groups** — that was a layout bug, not the product plan.  
**v2** = group-first design for **any** fleet size.

---

## Locked layout — one column, group blocks

```
┌─ Roster (fixed height ~8 lines, scroll inside) ──────────────┐
│ [Start] [Stop watch] [Clear]     12/32 selected · 4/6 live   │
│ [Search……………………] [Online ▼]                                  │
├──────────────────────────────────────────────────────────────┤
│ ▼ ☑ ● PP · 10 online · 4 in watch                            │  ← expanded (user opened)
│     ☑ 📌 ● Officer A (…0001)                    Live 2       │
│     ☑ 📌 ● Officer B (…0002)                    Rotate       │
│     … (8 more rows — scroll inside box)                      │
│ ▶ ☐ ● North · 6 online · 0 in watch                          │  ← collapsed
│ ▶ ☑ ● Ungrouped · 3 online · 2 in watch                      │
└──────────────────────────────────────────────────────────────┘
```

**Never:** member of PP on the right column while header is on the left.  
**Never:** two duplicate `WATCH | PIN | ST` header tables side by side.

---

## Expand / collapse — operator rules

### Controls (locked)

| Control | Action |
|---------|--------|
| **▶ / ▼** on group row | Expand or collapse **members only** |
| **Group checkbox** | Add/remove **all online** in group to watch set (respect **32 cap**) |
| **Member checkbox** | One BWC in/out of watch set |
| **Search** | Auto-**expand** any group that has a matching member |
| **Filter “In watch set”** | Only groups with ≥1 selected member; those groups **expanded** |

### Auto-expand (no extra click)

| Event | Roster does |
|-------|-------------|
| Member **live on tile** | Parent group **expands** |
| **Search** hits name/ID in group | That group **expands** |
| **FR hit** on BWC in group | Expand + scroll row into view (later) |

### Auto-collapse (optional, session)

| Event | Roster does |
|-------|-------------|
| Operator clicks **▼** | Stays collapsed until expand — **selection kept** |
| Page refresh | Reset to **default** rules (≤4 open, 5+ closed) |

---

## Group with 6 — walkthrough

**PP has 6 online officers.**

1. Roster loads: PP row shows `▶ PP · 6 online · 0 in watch` (collapsed — rule: 5+).  
2. Operator clicks **▶** → 6 indented rows appear under PP (one block).  
3. Operator checks **group box** → up to 6 added to watch (if room under 32).  
4. **Start watch** → 6 video tiles rotate through those 6 (or 32 watch set if more selected elsewhere).  
5. Operator clicks **▼** → rows hide; summary shows `6 in watch` — streams **unchanged**.

**Logical:** PP is always one island; 6 rows are **inside** it.

---

## Group with 10 — walkthrough

Same as 6, but:

- Default **collapsed** (one line).  
- Expanded = **10 rows** under PP — roster **scrolls** inside fixed-height box (~200px).  
- Video wall still **6 live** — watch set can hold all 10 for rotate/probe (Act 2).

**No special case code for “10”** — same expand/collapse as 6.

---

## Many groups + 32 watch cap

| Scenario | Behaviour |
|----------|-------------|
| 3 groups × 10 online | 3 collapsed lines by default; expand one at a time |
| Select all on 15-member group, watch already 20/32 | Select **12** more (to 32), toast **“Watch set full (32 max)”** |
| 32 selected across 4 groups | Summary: `32/32 selected`; each group header shows `N in watch` |
| Group all offline | Header greyed; checkbox **disabled** |

**Group checkbox** = “all **online** in this group” — offline rows visible when expanded but not bulk-selected.

---

## Density (shorter than today)

| Item | Value |
|------|--------|
| Member row | **24px** |
| Group header | **26px** |
| Member indent | **16px** left |
| Roster body max-height | **~200px** scroll (≈8 lines visible) |
| Columns | `W` · `P` · `St` · `Officer (…id)` · `Tile` — **one** header row |
| Pin | Icon only |
| Focus button | **Hidden** (tile click / future) |

**BWC on tile:** `3 · Chin · …0008` + hover = full ID (unchanged).

---

## What “expand” is NOT

| Not this | Why |
|----------|-----|
| Pop-out modal for group | Stays in roster — one scroll context |
| Second column for overflow | Caused the PP/kk split bug |
| Replace video grid | Roster only — 6 tiles stay above |
| SOS / PTT panel | FR face screen only |

---

## MOB deliverables (`mob-fr-roster-group-coherent`)

| # | Change |
|---|--------|
| 1 | **Remove** dual-column row split |
| 2 | **Group block** — header + members contiguous |
| 3 | **Expand/collapse** chevron + `rosterGroupExpanded` state |
| 4 | **Default expand** by member count (≤4 open, 5+ closed) |
| 5 | **Search** auto-expands matching groups |
| 6 | **Density** 24px + ~200px scroll + one header |
| 7 | **Header meta** `{online}/{total} online · {n} in watch` |

**Files:** `fr-live-watch.js`, `index.html` CSS, `en.json`  
**Risk:** Tier **1** — FR roster UI only  
**Not touched:** wall, SOS, PTT, server

---

## PASS checklist (any fleet size)

| # | Test |
|---|------|
| 1 | PP + 2 members — **all under one header**, not split |
| 2 | Mock or real **6+ group** — collapsed by default → **▶** shows all members in one block |
| 3 | Collapse — **watch ticks remain** |
| 4 | Search officer name — parent group **opens** |
| 5 | Select 32 — cap toast; group headers show **in watch** counts |
| 6 | Start / Stop watch unchanged |

---

## After PASS

```text
MOB-APPLY mob-fr-stop-video-toolbar
```

(Stop video · Stop all · tile ×)

---

## FAQ (user questions we pre-answer)

**Q: Why was it split left/right?**  
A: Layout bug in `mob-fr-roster-compact-bwc` — **reverted** in group-coherent MOB.

**Q: I have 10 in PP — do I scroll forever?**  
A: Collapsed = **one line**. Expand only when you need to pick officers; scroll **inside** short roster box.

**Q: Can I watch all 10?**  
A: **Yes** in watch set (up to 32). **6 live video** at a time — rest rotate (today’s product).

**Q: Expand PP and North at same time?**  
A: **Yes** — both can be open; roster scrolls. Default keeps big groups closed so the list stays short.

**Q: Group checkbox with 20 online?**  
A: Adds online until **32 cap** — message if full.

---

## Bottom line

| Concern | Plan |
|---------|------|
| Group 6 / 10 / 20 | **One block** · collapse when 5+ · expand on demand |
| Logical grouping | Members **never** leave parent group row |
| Expand | **▶ / ▼** · search/live auto-open · selection survives collapse |
| Not lab-only | Rules scale to **32 watch · many groups** |
| APPLY | `MOB-APPLY mob-fr-roster-group-coherent` when you say |
