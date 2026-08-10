# MOB DISC — Cases status words (locked vocabulary) (2026-08-09)

**Status:** LOCKED copy. Not a brainstorm dump.  
**Problem:** Phrases like “Ack’d · No input” and “empty after 24h / weekly aging” are engineer-speak. Supervisors need **clear ops English**.

---

## Locked status words (what the list shows)

One **Status** column. One primary badge. Optional second chip only when useful.

| Status (UI word) | Meaning (exact) | When it applies |
|------------------|-----------------|-----------------|
| **Open** | Alarm handled into a case; still active for follow-up | Case created / Ack’d from toast; work may continue |
| **Noted** | At least one add-on note exists | After first Save add-on |
| **Quiet close** | Closed with **no** add-on note yet | Ack/dismiss with zero notes — **this is the empty-ack signal**, said properly |
| **Amended** | A past note was edited or deleted by Super admin | After privileged edit/delete |
| **Closed** | Supervisor/admin marked review finished (optional later) | Explicit “Mark reviewed” — not auto |

**Do not ship:** “No input”, “Ack’d · No input”, “Needs review” as the only badge with no plain meaning.

---

## Locked filter words (Super admin / supervisor audit)

Audit is not “aging poetry.” Two filters, plain names:

| Filter (UI) | Exact rule |
|-------------|------------|
| **Quiet closes** | Status = **Quiet close** (closed, zero notes) |
| **Quiet over 24 hours** | Quiet close **and** closedAt older than **24 hours** |
| **Quiet over 7 days** | Quiet close **and** closedAt older than **7 days** |

Daily Super admin pass: open **Quiet over 24 hours**.  
Weekly sweep: open **Quiet over 7 days**.

Family filters stay separate: **SOS | Analytics** then **FR | ANPR | Weapon**.

---

## Case header line (exact pattern)

```text
{caseId}  ·  Rev {n}  ·  {Status}
kk · gun · closed 2026-08-08 20:39 by global
Last touch: global · add-on · 2026-08-08 21:02
```

If Quiet close:

```text
WD-20260808-…  ·  Rev 1  ·  Quiet close
```

Supervisor reads that in one glance: someone Ack’d, **nobody wrote anything yet**.

---

## Why these words (not following your anger — fixing the product)

| Bad (engineer) | Locked (ops) | Why |
|----------------|--------------|-----|
| No input | **Quiet close** | Says the event was closed **silently** |
| Needs review | **Quiet over 24 hours** / **7 days** | Says **what** to open and **how old** |
| Ack’d · No input | Status **Quiet close** | One status, not a mashup |
| Empty ack | Same as Quiet close | One term everywhere |

Axon-class products use **clear queue names** (“Uncategorized”, “Pending review”) — not slash-math in the badge.

---

## Operator vs Super admin (unchanged, restated clean)

- Anyone in scope: open Cases, read, **add note** → status becomes **Noted**.  
- Super admin only: **Edit / Delete** past notes → status chip **Amended** (plus touch log).  
- Nobody needs Super admin to clear a Quiet close — they **add a note** or Super admin **Marks reviewed** later if we add Closed.

---

## Ships with

`OPS-CASE-UI-DESK-V1` — these exact labels in list + filters + header.  
Server store carries `status` field: `open | noted | quiet_close | amended | closed`.

---

## Next APPLY (unchanged)

`MOB-APPLY OPS-CASE-SERVER-STORE-V1`
