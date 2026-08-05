# MOB DISC — FR BWC roster: 5×6 levels, group rolls right (2026-08-05)

**Status:** APPLIED `FR-BWC-ROSTER-5X6-LEVEL-V1` (2026-08-05).  
**Scope:** FR Live Watch roster chrome + live/BWC height split only. No hit→slot1, firewall, storage, ANPR, tone.

## Confirm: I understand

Chrome APPLY nearly passed. **BWC online is too tall** — it stole too much from the 6 live tiles. Shrink BWC back down. Live 3×2 gets the rest of the height.

Roster is **not** one skinny PP column with empty space. It is a **5-column × 6-row** board (row 1 = team name).

```
One LEVEL (fixed short height — live tiles keep the rest)
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│ PP       │ PP (more)│ TEAM 2   │ TEAM 3   │ TEAM 4   │  ← row 1 = heading
│ Chin     │ f        │ …        │ …        │ …        │
│ kk       │ g        │          │          │          │
│ a        │ h        │          │          │          │
│ b        │          │          │          │          │
│ c        │          │          │          │          │  ← 6 rows inc. name
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

1. **PP (Chin, kk, a, b, c)** fills **one column** (heading + 5 names = 6 rows).
2. **More PP people** → next column **to the right**, same **PP** heading again.
3. **Next team** starts in the next free column to the right, and so on.
4. Click **PP checkbox** (any PP heading column) → select **whole team**, including names that rolled into extra columns.
5. Many teams → next **level** (another 5×6 band). **One scroll = one level** (snap). No long up/down hunt through names.
6. **Rest of the panel height → 6 live tiles.**

## Now vs target

| Piece | Now | Target |
|-------|-----|--------|
| Live vs BWC height | BWC too tall; live tiles squeezed | BWC = **one 5×6 level** tall; live 3×2 takes remaining space |
| Group layout | One vertical PP card, empty right | Fill **left → right** across 5 columns |
| Group overflow | Long vertical list | Same group **rolls right** into next column + same heading |
| Team checkbox | Already selects all members in that group object | Keep that: one PP tick = **all PP**, even multi-column |
| Scroll | Pixel scroll in a tall wrap | **Snap one level** (one 5×6 page) |

## One next APPLY

**`MOB-APPLY FR-BWC-ROSTER-5X6-LEVEL-V1`**

Will do only:

1. Shrink BWC wrap to one 5×6 level height; give leftover height back to `.ax-fr-grid`.
2. Rebuild roster as 5 columns × 6 rows (heading counts as row 1). Group overflow continues in the next column with the same heading.
3. PP / group checkbox still selects **every** member of that group across rolled columns (`toggleGroupWatch` on full device list).
4. Extra teams wrap to the next 5×6 level; scroll **snaps one level**.
5. **Do not touch** KS chips, Recent 12, firewall, storage, rotate timer, map popup, field tone, hit→slot1.

## Operator pass (after APPLY)

Hard-refresh once. Filter = **Online**.

- Live tiles bigger again; BWC is a short 5×6 strip.
- PP (Chin, kk, …) fills left column; extra PP names go right under another PP heading.
- Tick PP once → whole team selected (including rolled columns).
- Next team sits to the right. Many teams → one scroll jumps one full level, not a long vertical list.
