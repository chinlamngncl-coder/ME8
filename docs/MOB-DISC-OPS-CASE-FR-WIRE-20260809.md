# MOB DISC — OPS-CASE-FR-WIRE-V1 (2026-08-09)

**Status:** APPLIED.  
**APPLY:** `OPS-CASE-FR-WIRE-V1`  
**Parent:** `docs/MOB-DISC-OPS-CASE-CONSOLIDATED-WEBCHECK-20260809.md`

---

## What this does

On **FR Ack** or **Dismiss** (toast / drawer / HQ bar):

- Creates/links one Ops Case `FR-{YYYYMMDD}-{shortHit}` under `storage/ops-cases/{day}/ANALYTICS/FR/`
- `refs.frHitId` = live hit id (idempotent)
- Status = **Ack only** (notes only later in Evidence → Cases)
- Lab preview hits skipped
- **ANPR** hits skipped (next APPLY: `OPS-CASE-ANPR-WIRE-V1`)

Wire failure never blocks Ack UI.

---

## Code

- `lib/opsCaseStore.js` — `findByFrHitId`, `ensureFromFrHit`
- `server.js` — `POST /api/ops-cases/from-fr`
- `public/js/fr-alarm.js` — `wireFrOpsCase` on Ack/Dismiss

---

## Operator check

1. Restart · hard refresh  
2. FR blacklist hit → **Ack**  
3. Evidence → Cases → Analytics / FR → row **Ack only**
