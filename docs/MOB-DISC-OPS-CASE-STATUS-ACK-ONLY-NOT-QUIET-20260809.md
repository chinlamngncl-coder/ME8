# MOB DISC — Kill “Quiet.” Status words that mean something (2026-08-09)

**Status:** LOCKED. Replaces “Quiet close / Quiet over …” — that word was useless.  
**You:** “What is quiet?” — fair. Ops never say “quiet close.”

---

## Locked words (no “quiet”)

### Status on the case (one badge)

| UI word | Exact meaning |
|---------|----------------|
| **Ack only** | Alarm was acknowledged (or dismissed into a case) and **nobody has written a note yet** |
| **Has notes** | At least one add-on note exists |
| **Amended** | Super admin edited or deleted a past note |
| **Reviewed** | Super admin (or allowed role) marked the case reviewed — optional later |

**Ack only** = the empty one. Plain. What the button was. What is missing (notes).

### Audit filters (daily / weekly)

| UI filter | Exact rule |
|-----------|------------|
| **Ack only** | Status = Ack only |
| **Ack only · 24h+** | Ack only **and** closed more than **24 hours** ago |
| **Ack only · 7d+** | Ack only **and** closed more than **7 days** ago |

Daily Super admin: open **Ack only · 24h+**.  
Weekly: open **Ack only · 7d+**.

---

## Case header example

```text
WD-20260808-…  ·  Rev 1  ·  Ack only
kk · gun · ack 2026-08-08 20:39 by global
```

After a note:

```text
WD-20260808-…  ·  Rev 2  ·  Has notes
```

---

## Banned from product copy

- Quiet  
- Quiet close  
- No input  
- Empty ack (as a badge — meaning stays, words don’t)  
- “Needs review” with no definition  

Internal code may use `ack_only` — UI never says “quiet.”

---

## Unchanged rules

- Operators **add notes** (turns **Ack only** → **Has notes**).  
- Super admin **Edit/Delete** past notes only.  
- Evidence → Cases is the office. Toast is alarm only.

---

## Next

`MOB-APPLY OPS-CASE-SERVER-STORE-V1`  
(UI desk ships these exact labels.)
