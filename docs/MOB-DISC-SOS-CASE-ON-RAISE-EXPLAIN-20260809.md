# MOB DISC — What is SOS-CASE-ON-RAISE-V1? (2026-08-09)

**Status:** APPLIED — see `MOB-DISC-SOS-CASE-ON-RAISE-APPLY-20260809.md`.  
**Explain:** `MOB-DISC-SOS-CASE-ON-RAISE-EXPLAIN-20260809.md`

---

## Plain English

**Today:** Pressing SOS creates a row on the Ops strip (ledger). An Ops **Case** (`SO-…`) in Evidence → Cases is created mainly when you **Ack**.

**This APPLY:** Create (or reuse) that **same** `SO-…` case **as soon as SOS fires** — not only when someone Acks.

So: SOS button → Ops strip **and** Evidence → Cases both show the event as a **case**, immediately.

---

## Why it exists

You said: settling SOS is **case** work; empty Cases after press felt broken.  
Strip rename/Open case fixed the **face**. Raise-still-needed fixes the **office**: Cases should not wait for Ack to know a SOS happened.

| Moment | Today (after strip APPLY) | After `SOS-CASE-ON-RAISE-V1` |
|--------|---------------------------|------------------------------|
| SOS pressed | Ops strip row · Cases often empty | Ops strip row · **Cases has `SO-…`** |
| Open case | Works if Ack already created case | Works **right away** |
| Ack | Creates/updates case | **Updates same** case (Ack only / Has notes) — no second case |

---

## What it does **not** do

- Does not put toast as the filing cabinet.  
- Does not remove Ops strip.  
- Does not auto-Ack.  
- Does not invent CSV / report export (separate APPLY).  
- Does not create FR/ANPR/Weapon cases on raise (those stay Ack/dismiss wire).

---

## How (agent — when APPLY)

1. On SOS raise path (same place ledger entry is written), call `ensureFromSosRaise` (or extend `ensureFromSosAck` pattern) → one `SO-…` linked to ledger id.  
2. Idempotent: second raise/refresh / Ack → **same** caseId.  
3. Status before Ack: open / pending (product word TBD — not “Ack only” until Ack).  
4. Scope: still dispatch-scoped cams.

Exact status word before Ack: lock at APPLY time (recommend **Open** on case until Ack → then **Ack only** / **Has notes**).

---

## Operator check (after APPLY)

1. Press SOS (no Ack yet).  
2. Evidence → Cases · Family SOS → see new `SO-…`.  
3. Ops → Open case → same case.  
4. Ack → same case updates; no duplicate.

---

## Related discs

- Shift story: `MOB-DISC-SOS-LOG-TO-SOS-CASE-SHIFT-20260809.md`  
- Strip done: `MOB-DISC-SOS-OPS-STRIP-ACTIONS-APPLY-20260809.md`  
- Empty Cases after press (old behavior): `MOB-DISC-SOS-CASES-VS-OPS-LEDGER-OPERATOR-20260809.md`

**Say `MOB-APPLY SOS-CASE-ON-RAISE-V1` when you want code.**
