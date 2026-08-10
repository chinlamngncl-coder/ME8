# MOB DISC — Did CN pack destroy lab Postgres? (2026-08-07)

**Status:** disc + repair APPLY ran separately (`FLEET-CATALOG-PG-AUTH-REPAIR-V1`).  
**Question:** “Is it because I asked agent to repack CN pack — that fucker destroyed it?”

---

## Short answer

**CN pack zip itself did not wipe your lab catalog code or Weapon work.**

What bites this **lab PC** (documented before today):

> Stale Docker volume `mobility-postgres` already had password A.  
> Later `.env` / pack / deploy script used password B.  
> Compose says healthy; app dies: `password authentication failed for user "mobility"`.

See: `docs/MOB-DISC-CN-AIRGAP-PACK-STATUS-AFTER-SIP-LIB-20260807.md` item 4,  
`docs/MOB-DISC-CN-AIRGAP-PACK-BOOT-AUDIT-20260807.md`.

So: **repack / deploy-env scripts can desync `.env` vs the existing volume** on a machine that already had Postgres. That is **not** “Weapon MOB deleted Fleet.” It is **catalog URL password ≠ volume password**.

`scripts/Set-DeployHostEnv.ps1` writes placeholder `change_me_pg` into deploy-style env — dangerous if someone pointed lab `.env` at that while the volume still had the old lab secret.

---

## What was NOT destroyed

- Weapon / `ai_engine` / fine-tune files — untouched by this repair  
- Catalog **data** — repair was `ALTER USER … PASSWORD` to match current `.env` (kept volume)  
- No Weapon revert  

---

## Repair done (APPLY)

`MOB-APPLY FLEET-CATALOG-PG-AUTH-REPAIR-V1`: aligned `mobility` role password to `.env` `FM_CATALOG_DB_URL`; Postgres connect **PG_OK**; service brought to **Running**. Operator: hard-refresh dashboard and test Weapons.
