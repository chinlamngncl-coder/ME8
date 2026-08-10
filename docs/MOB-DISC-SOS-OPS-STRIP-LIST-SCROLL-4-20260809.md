# MOB DISC — SOS strip list: grow then scroll after 4 (2026-08-09)

**Status:** APPLIED with `SOS-OPS-STRIP-ACTIONS-V1`.  
**Check:** Was `max-height: 228px` scroll — now **~4 rows** then scroll.

---

## Lock

| Rule | Value |
|------|--------|
| Visible rows before scroll | **~4** |
| Fewer than 4 | List **grows** with content (no huge empty box) |
| 5+ | Fixed viewport ≈ 4 rows · **scroll inside** list only |
| Ops column | Must **not** grow forever / shove PTT / rest of Ops off-screen |

```text
1–4 rows:  box hugs content
5+ rows:   ┌────────────┐
           │ row 1      │
           │ row 2      │
           │ row 3      │
           │ row 4    ░ │ ← scrollbar
           └────────────┘
```

**CSS approach:** `max-height` ≈ `4 * rowHeight` (row ~48–52px with 36px thumb → **max-height: 208px** or `calc(4 * 52px)`). Keep `overflow-y: auto`. Do not set a large min-height that wastes space when empty/one row.

---

## APPLY

Included in `MOB-APPLY SOS-OPS-STRIP-ACTIONS-V1` (not a separate APPLY).
