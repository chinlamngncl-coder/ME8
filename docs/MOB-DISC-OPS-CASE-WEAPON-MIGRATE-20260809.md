# MOB DISC — OPS-CASE-WEAPON-MIGRATE-V1 (2026-08-09)

**Status:** APPLIED.  
**APPLY:** `OPS-CASE-WEAPON-MIGRATE-V1`  
**Parent:** `docs/MOB-DISC-OPS-CASE-CONSOLIDATED-WEBCHECK-20260809.md`

---

## What this does

1. **Weapon Ack / Dismiss / overflow** → server creates/links one `WD-…` ops case (`refs.weaponHitId`).  
2. Status on wire = **Ack only** (no toast notes). Add notes in **Evidence → Cases**.  
3. Toast **History** button → **Cases** (deep-link Weapon filter). Toast is alarm-only again.  
4. SessionStorage weapon History office cleared / no longer the filing cabinet.

---

## Code

- `lib/opsCaseStore.js` — `findByWeaponHitId`, `ensureFromWeaponHit`  
- `server.js` — `POST /api/ops-cases/from-weapon`  
- `public/js/weapon-alarm.js` — wire on close; Cases deep-link; hide History FAB/office  
- `public/js/ops-cases-ui.js` — `openWeaponCases({ caseId })`

---

## Operator check

1. Restart · hard refresh  
2. Weapon hit → **Ack**  
3. Evidence → Cases → Analytics / Weapon → row **Ack only**  
4. Toast **Cases** opens the same desk  
5. Add note in Cases → **Has notes**
