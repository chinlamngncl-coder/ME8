# MOB DISC — OPS-CASE-ANPR-WIRE-V1 (2026-08-09)

**Status:** APPLIED.  
**APPLY:** `OPS-CASE-ANPR-WIRE-V1`  
**Parent:** `docs/MOB-DISC-OPS-CASE-CONSOLIDATED-WEBCHECK-20260809.md`

---

## What this does

On **ANPR critical alert Ack / Dismiss** (same FrAlarm toast / drawer / HQ bar as FR):

- Creates/links one Ops Case `AN-{YYYYMMDD}-{shortHit}` under `storage/ops-cases/{day}/ANALYTICS/ANPR/`
- `refs.anprHitId` + plate / listStatus (idempotent)
- Status = **Ack only** (notes in Evidence → Cases)
- Lab preview skipped
- Non-ANPR hits still use FR wire

Plain Recent Plates ticks that never open the alarm UI do **not** create cases — only Ack/Dismiss on the raised ANPR alarm.

---

## Code

- `lib/opsCaseStore.js` — `findByAnprHitId`, `ensureFromAnprHit`
- `server.js` — `POST /api/ops-cases/from-anpr`
- `public/js/fr-alarm.js` — `wireFrOpsCase` routes ANPR → `/from-anpr`

---

## Operator check

1. Restart · hard refresh  
2. ANPR blacklist/wanted hit → **Ack**  
3. Evidence → Cases → Analytics / ANPR → row **Ack only**
