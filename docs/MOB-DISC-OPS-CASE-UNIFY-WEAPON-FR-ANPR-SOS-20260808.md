# MOB DISC — Unify case records: Weapon + FR + ANPR + SOS (2026-08-08)

**Status:** architecture lock. **Weapon gate + caseId/Rev applied on Weapon only.**  
FR / ANPR / SOS **not** wired yet — same model, one APPLY per surface (or one shared store MOB then adapters).

---

## Goal

One **ops case** language for everything that needs a record:

| Kind | Prefix (system) | Examples |
|------|-----------------|----------|
| Weapon | `WD-…` | gun/knife alert closed → case |
| FR | `FR-…` | blacklist / hit alert |
| ANPR | `AN-…` | plate watchlist / critical plate |
| SOS | `SO-…` | SOS event ledger link |

Not one flat folder of lookalike names. **Unique caseId**, **day partition**, **Rev chain**, **search by fields**.

---

## Shared case shape (all kinds)

```text
kind: weapon | fr | anpr | sos
caseId: WD-|FR-|AN-|SO- + YYYYMMDD + unique
rev: 1..N (system only)
camId / deviceName (when applicable)
hitAt / closedAt / closedBy
notes[] / audit[]   ← who + when every touch
refs: { cropFile | evidenceId | sosId | plate | … }
```

Store target (later server MOB):

```text
storage/ops-cases/
  2026-08-08/
    WD-….json
    FR-….json
    AN-….json
    SO-….json
```

Search UI (later): one **Ops cases** panel — filter kind / date / cam / user / caseId / note text.

---

## Gate (same for all kinds when wired)

| Action | Operator | Super admin |
|--------|----------|-------------|
| Create / Ack / add-on note (new Rev) | Yes | Yes |
| Edit / delete past note or wipe case | No | Yes |

---

## Build order (do not boil ocean)

| # | Status | MOB |
|---|--------|-----|
| 1 | **DONE** | `WEAPON-ADDON-SUPERADMIN-GATE-V1` + Weapon `caseId` / Rev |
| 2 | next | `OPS-CASE-SERVER-STORE-V1` — shared folder + API (all kinds can write) |
| 3 | after 2 | `FR-CASE-WIRE-V1` |
| 4 | | `ANPR-CASE-WIRE-V1` |
| 5 | | `SOS-CASE-WIRE-V1` (link existing SOS ledger — do not fork SOS truth) |
| 6 | | `OPS-CASE-SEARCH-UI-V1` |

**SOS note:** SOS already has a ledger. Unify = **link** SOS id into ops-case (`kind: sos`, `refs.sosId`), not a second SOS database.

---

## What operator does now

Hard refresh → Weapon History → Case shows **caseId · Rev N**.  
Operator: add notes only.  
Super admin: Edit / Delete on past notes.  

FR / ANPR / SOS case buttons come after server store + each wire MOB.
