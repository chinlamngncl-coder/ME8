# MOB DISC — Ops Cases CONSOLIDATED + web-checked (2026-08-09)

**Status:** Single source of truth for this arc. Supersedes soft/conflicting phrases (“quiet”, toast-as-office, A/B menus).  
**Web check done this turn** (not memory-only): Axon Records/Standards case tasks & supervisor review inboxes; Motorola CommandCentral Evidence/Vault notes + audit logging; DEMS / forensic-notes practice (append-oriented audit, RBAC, privileged amend).  
**Code:** Ops Cases arc complete for store/desk/wires — Store ✅ · Desk ✅ · SOS ✅ · Weapon ✅ · FR ✅ · `OPS-CASE-ANPR-WIRE-V1` ✅ (2026-08-09).

---

## A. What the market pattern is (checked)

| Source | What they do | What we copy (not their brand UI) |
|--------|----------------|-------------------------------------|
| **Axon Records / Standards** | Cases/investigations; **tasks + review inboxes**; supervisor approve/reject; unit-scoped lists; work happens in **case profile**, not the live alert flash | Dedicated **Cases desk** + supervisor **filter queues** (Ack only · 24h+ / 7d+ / 30d+) |
| **Motorola CommandCentral Evidence / Vault** | Content gathered into **case folders**; **notes/annotations**; **detailed audit log** on actions; privileged edit paths (e.g. transcript edit needs admin permission; original retained) | **Case file** + notes + touch log; Super admin for rewrite/delete; append preferred |
| **DEMS / forensic notes practice** | Chain-of-custody style logging; **RBAC**; corrections often as **new logged events**; no “edit via FTP” | App API only writes cases; team scope; no disk/FTP office |

**Pattern in one line:** Live alert ≠ records office. Append notes. Privileged amend. Supervisor queues for incomplete work. Scope by unit/role. Full audit who/when.

---

## B. What ME8 will build (locked product)

### B1. One office

- **Evidence → Cases** (one left-nav item).  
- **Not** four top tabs.  
- **Not** toast as the filing cabinet.  
- Toast / HQ blink = **alarm only** (Ack / Open live / Show map).

### B2. Taxonomy + storage tree

```text
storage/ops-cases/
  {YYYY-MM-DD}/
    SOS/
      SO-{date}-{id}.json
    ANALYTICS/
      FR/
        FR-{date}-{id}.json
      ANPR/
        AN-{date}-{id}.json
      WEAPON/
        WD-{date}-{id}.json
```

- Day first → family (SOS | Analytics) → type → **system caseId**.  
- One JSON per case: notes[], audit[], rev, status, refs.  
- SOS case **links** existing SOS ledger id (no second SOS DB).

### B3. Who may do what

| Action | Operator / supervisor (in scope) | Super admin |
|--------|----------------------------------|-------------|
| Enter Evidence → Cases | Yes | Yes |
| See cases | **Dispatch scope only** (same as Fleet/Ops) | **All** |
| Add note (new Rev) | Yes | Yes |
| Edit / Delete **past** note | No | Yes |
| FTP / hand-edit storage | No | No (ops policy + API-only write) |

Normal follow-up = **add note**, not hunt Super admin.  
Super admin = rewrite/delete + full see-all + monthly compliance pass.

### B4. Status words (no “quiet”)

| Status | Meaning |
|--------|---------|
| **Ack only** | Closed from alarm path; **zero** add-on notes |
| **Has notes** | ≥1 add-on note |
| **Amended** | Super admin edited/deleted a past note |
| **Reviewed** | Explicit mark reviewed (later; optional) |

### B5. Audit filters (day / week / month — all three)

| Filter | Rule | Cadence |
|--------|------|---------|
| **Ack only** | Zero notes, any age | Spot check |
| **Ack only · 24h+** | Ack only and age > 24h | **Daily** |
| **Ack only · 7d+** | Ack only and age > 7d | **Weekly** |
| **Ack only · 30d+** | Ack only and age > 30d | **Monthly** |

When an age filter is on: sort **oldest closed first**.

### B6. Case header (exact idea)

```text
{caseId} · Rev {n} · {Status}
{cam} · {class/kind} · closed {time} by {user}
Last touch: {user} · {action} · {time}
```

### B7. Rev / integrity

- System assigns **Rev N** on material changes (ack create, add note, admin edit/delete).  
- Operator cannot type or fake Rev in a filename.  
- Touch log: who + when + action + rev (+ note text snippet when relevant).

---

## C. Logic double-check (no contradictions)

| Earlier mistake | Locked now |
|-----------------|------------|
| Toast History as main workplace | Toast = alarm only; Cases = office |
| Super admin required to “go in” | Anyone in Evidence may enter; scope filters rows |
| “Quiet close / No input” | **Ack only** |
| Only 24h + 7d | **+ 30d monthly** |
| Flat one folder / fake Rev filenames | Day → SOS\|ANALYTICS → type → caseId.json |
| Edit path unclear | Append note first; Super admin for in-place edit/delete |
| FR/ANPR/SOS forgotten | Same Cases desk + tree; wire after store |
| Lab sessionStorage as forever | Temporary until server store; then API-only |

Weapon session History today = **rehearsal only**; dies or becomes thin deep-link after Weapon migrate.

---

## D. Build order (agent drives; you APPLY one name)

| # | APPLY | Delivers |
|---|-------|----------|
| **1** | `OPS-CASE-SERVER-STORE-V1` ✅ | Tree + APIs (create/list/get/add-note/edit-delete) + auth + scope + role |
| **2** | `OPS-CASE-UI-DESK-V1` ✅ | Evidence → Cases + status + Ack-only filters (24h/7d/30d) + case detail |
| **3** | `OPS-CASE-WEAPON-MIGRATE-V1` ✅ | Weapon Ack/notes → server; remove toast-as-office History |
| **4** | `OPS-CASE-FR-WIRE-V1` ✅ | FR Ack/dismiss → `FR-` case (**Ack only**) |
| **5** | `OPS-CASE-ANPR-WIRE-V1` ✅ | ANPR Ack/dismiss → `AN-` case (**Ack only**) |
| **6** | `OPS-CASE-SOS-WIRE-V1` ✅ | SOS Ack → linked `SO-` case (**Ack only** if no note) |

### Parallel arcs still open (do not drop)

| Arc | Pending APPLYs / work |
|-----|------------------------|
| **SOS dual media** | Record ✅ · Dock watch ✅ · Matchback ✅ · Dual UI ✅ · serial registry still parked |
| **Ops Cases UI** | Store ✅ · Desk ✅ · SOS ✅ · Weapon ✅ · FR ✅ · ANPR ✅ |
| **Weapon Track B** | Colab BOTH train when GPU free → overwrite `.pt` → `WEAPON-B-NEGATIVES-RELOAD-V1` (keep A until B PASS) |
| **Weapon toast** | Alarm-only ✅ (History → Cases deep-link) |

---

## E. Web references (this check)

- Axon case tasks / detective review / disposition supervisor review / unit inboxes — axon.com help (Records / Standards).  
- Motorola CommandCentral Evidence/Vault — case organization, notes, audit logging, privileged transcript edit with version/audit.  
- DEMS / forensic-notes industry writeups — RBAC, audit on note add/update/delete, append-oriented custody thinking.

We are **not** cloning Axon/Motorola screens. We are aligning **ME8 logic** with those custody/review norms.

---

## F. What you do

`MOB-APPLY OPS-CASE-SERVER-STORE-V1`
