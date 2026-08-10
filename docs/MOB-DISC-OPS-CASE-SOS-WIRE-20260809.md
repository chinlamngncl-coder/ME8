# MOB DISC — OPS-CASE-SOS-WIRE-V1 (2026-08-09)

**Status:** APPLIED.  
**APPLY:** `OPS-CASE-SOS-WIRE-V1`  
**Parent:** `docs/MOB-DISC-OPS-CASE-CONSOLIDATED-WEBCHECK-20260809.md`  
**Status words:** `docs/MOB-DISC-OPS-CASE-STATUS-ACK-ONLY-NOT-QUIET-20260809.md`

---

## What this does

On **SOS Ack** (`POST /api/sos-acknowledge`), Fleet ensures one Ops Case:

- Type **SOS**, id `SO-{YYYYMMDD}-{hex}`
- Path `storage/ops-cases/{day}/SOS/{caseId}.json`
- `refs.sosIncidentId` = SOS ledger entry id (ledger stays truth for alarm media)
- Idempotent: second Ack for same ledger id returns the same case

Ack response may include `opsCase` (best-effort). Wire failure **never** fails SOS Ack.

---

## Status: Ack only vs Has notes (your “ack and no inputs”)

| SOS Ack behavior | Ops Case badge |
|------------------|----------------|
| Ack with **empty** note (no typed text) | **Ack only** (`ack_only`) — closed from alarm, zero add-on notes |
| Ack with a **typed** note | Note is seeded as first case note → **Has notes** |
| Later add note in Evidence → Cases | **Ack only** → **Has notes** |

UI word is **Ack only** — not “quiet”, not “no inputs” (banned product copy). Meaning is the same: acknowledged, nobody wrote follow-up yet.

Audit filters on Cases desk (Ack only · 24h+ / 7d+ / 30d+) use this status.

---

## Not in this APPLY

- Backfill of old SOS ledger rows (manual/later if needed)
- Create case on brand-new SOS before Ack (filing starts at Ack)
- Changing Ops SOS ledger UI (still the alarm/incident surface)
- Weapon / FR / ANPR wires

---

## Code

- `lib/opsCaseStore.js` — `findBySosIncidentId`, `ensureFromSosAck`
- `server.js` — call after successful SOS Ack

---

## Operator check

1. Restart Fleet · hard refresh  
2. Trigger SOS → Ack **without** typing a note  
3. Evidence → Cases → Family SOS → row shows **Ack only**  
4. Optional: Ack another with a short note → **Has notes**
