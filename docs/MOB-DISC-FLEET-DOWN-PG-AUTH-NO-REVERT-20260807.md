# MOB DISC — Fleet down: real cause (Postgres auth) — NO REVERT (2026-08-07)

**Status:** disc only. **No revert. No destroy Weapon / ai_engine work.**  
**Operator:** Blank `192.168.1.38:4438` + `RESTART-FLEET` CANCELLED / service **PAUSED**. Do not revert product MOBs.

---

## Confirm (what your screens show)

1. Browser `:4438` = dark blank → **HTTPS dashboard has no live Node process**.  
2. `RESTART-FLEET.bat` → **UbitronC2 PAUSED** after repeated **application startup failures**.  
3. Log line `shutdown draining PostgreSQL catalog | startup-failure` is the **shutdown after** the real error — not the root cause.

---

## Root cause (proven in lab logs)

From `storage/service-stdout.log` / `service-stderr.log` (repeating now):

```text
[Media] ERR startup blocked | {"error":"password authentication failed for user \"mobility\""}
```

Then:

```text
shutdown draining PostgreSQL catalog | {"signal":"startup-failure"}
```

So:

| Fact | Value |
|------|--------|
| Catalog URL target | `mobility` @ `127.0.0.1:5432` / db `mobility` |
| Docker `mobility-postgres` | **Up / healthy** (port 5432) |
| App `.env` `FM_CATALOG_DB_URL` | Password in URL **does not match** Postgres volume password |
| Service | Crash-loops → Windows puts **UbitronC2 = PAUSED** → bat refuses restart |
| `:4438` | Empty because process **never stays running** |

This matches existing paper: stale Docker volume + different `.env` password  
(`docs/MOB-DISC-CN-AIRGAP-PACK-BOOT-AUDIT-20260807.md`, CN airgap pack status).

**Not caused by:** Weapon holdOnly, warm-auto, `ai_engine`, analytics-hub cache bust.  
Those do not run before `bootstrapSiteDatabase()`. Wrong suspect earlier — **withdraw revert recommendation.**

---

## Also noted (secondary — not blank dashboard)

- `me8-wvp` container **Exited (1)** ~4h ago — hurts WVP video after Fleet is up; **fix after** catalog auth works.  
- Weapon poller log lines appear **before** catalog fail on each crash loop — normal require/init order; not the killer.

---

## How to get it working (one path — no Weapon revert)

**Goal:** Make `FM_CATALOG_DB_URL` password match the running `mobility-postgres` data volume, then clear PAUSED and start service.

### Option A (preferred — keep DB data)

1. You (or APPLY) set Postgres role password **inside** the container to match the password already in `.env` `FM_CATALOG_DB_URL`  
   (or update `.env` to the known good password for that volume — **your** choice; agent must not invent a new password without you).  
2. Clear service PAUSED / restart **UbitronC2** as Administrator (`RESTART-FLEET.bat` Yes on UAC).  
3. Confirm log: `dashboard listening` / HTTPS listening — **no** `password authentication failed`.  
4. Open `https://192.168.1.38:4438` (accept cert once if needed).

### Option B (destructive — only if you order)

Recreate `mobility-postgres` volume → **catalog data loss** unless you have dump. **Do not** do this by default.

### After Fleet is up

Then check `me8-wvp` (separate MOB / compose up) if live GB28181 needed.

---

## APPLY when you want the agent to repair (no revert)

`MOB-APPLY FLEET-CATALOG-PG-AUTH-REPAIR-V1`

Exact scope:

1. Diagnose password mismatch only (no Weapon file revert).  
2. Align Postgres `mobility` password with `.env` **or** confirm which password you want (you say).  
3. Resume/restart `UbitronC2` (or guide Admin restart).  
4. Prove startup OK in `service-stdout.log`.  
5. Stop. No ai_engine / Weapon changes in that MOB.

Until APPLY: you can still fix Option A yourself if you know the volume password; agent will not edit `.env` or run ALTER without APPLY.

---

## Standing

- **No revert** of Weapon / warm / ai_engine unless you later name a different MOB.  
- Blank `:4438` = **Postgres auth**, not “wake holdOnly.”
