# MOB DISC — Ack-only audit windows: day / week / month (2026-08-09)

**Status:** LOCKED. Extends Ack-only filters. No “quiet.”  
**You:** Why no monthly? Think like real ops / evidence programs — not only 24h and 7d.

---

## What serious programs actually do

Police / command-center evidence and CAD follow-up queues almost always use **tiered aging**, not one bucket:

| Cadence | Who | Purpose |
|---------|-----|---------|
| **Shift / 24h** | Supervisor on duty | Catch “Ack only” before the next shift forgets the scene |
| **Weekly** | Unit supervisor | Clear backlog that escaped daily pass |
| **Monthly** | Evidence / quality / Super admin | Compliance sweep, training gaps, pattern report (“how many Ack-only died untouched?”) |
| **Quarterly / annual** | Rare in live UI | Archive / retention policy — not a daily Cases filter |

Axon Evidence-class and Motorola CommandCentral-class products emphasize **review queues + retention timelines**. Live supervisor UI is usually **day / week**; **month** shows up in **compliance and quality** reviews. Skipping monthly leaves a hole: weekly can still miss items, and leadership never sees a clean “last 30 days silent Acks” list.

**Conclusion:** Ship **three** Ack-only age filters. Monthly is required for Super admin audit, not optional poetry.

---

## Locked filters (exact UI words)

Status badge stays: **Ack only** | **Has notes** | **Amended** | **Reviewed** (later).

| Filter label | Rule |
|--------------|------|
| **Ack only** | Zero notes (any age) |
| **Ack only · 24h+** | Ack only and closed **> 24 hours** |
| **Ack only · 7d+** | Ack only and closed **> 7 days** |
| **Ack only · 30d+** | Ack only and closed **> 30 days** |

**Who uses which (locked SOP text for the product / training):**

| Pass | Filter | Owner |
|------|--------|--------|
| Daily | **Ack only · 24h+** | Supervisor / Super admin on duty |
| Weekly | **Ack only · 7d+** | Supervisor / Super admin |
| Monthly | **Ack only · 30d+** | Super admin (quality / compliance) |

Nested ages are intentional: 30d+ ⊆ 7d+ ⊆ 24h+ ⊆ Ack only. Monthly list is the **stubborn silent** set.

---

## Case list sort (locked default for audit)

When any **Ack only · …** filter is on: sort **oldest closed first** (worst first).  
Not newest first — that hides monthly rot at the bottom.

---

## What we will not do

- No fourth “quarterly” live filter in v1 (use monthly + export later).  
- No vague “Needs review” without Ack only + age.  
- No “Quiet.”

---

## Ships with

`OPS-CASE-UI-DESK-V1` — these four Ack-only filters + oldest-first when age filter active.  
Server stores `closedAt` + note count so filters are real.

---

## Next APPLY

`MOB-APPLY OPS-CASE-SERVER-STORE-V1`
