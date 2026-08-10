# MOB DISC — Must users do PG/WVP repair every Start? **No** (2026-08-07)

**Status:** disc only. No code until APPLY.  
**Operator:** “So every time I start it as software, if user is using, I have to do all this shit?”

---

## Short answer

**No.**

What you just lived through is **lab recovery after another agent’s pack/compose desynced secrets on existing Docker volumes**. It is **not** the normal Start path for a customer (or for you on a clean day).

A packed Mobility Axiom user must only:

1. Docker Desktop on (if that ship uses compose)  
2. Double-click **Setup / Start** (one path)  
3. Open the dashboard URL  

They must **never**: ALTER Postgres, recreate Redis, edit `WVP_SIP_PROXY_TARGET`, or run PowerShell for bring-back.

---

## What “all this shit” actually was

| Pain | Cause | Normal Start? |
|------|--------|----------------|
| Catalog `password authentication failed` | `.env` password ≠ **existing** `mobility-postgres` volume (pack wrote `change_me_pg`; lab `.env` kept long secret) | **No** — virgin install creates volume once with matching password |
| `UbitronC2` PAUSED | App crash-looped on catalog auth → Windows paused service | **No** — follows from above |
| Live won’t call / WVP dead | `me8-wvp` down: DB or **Redis** password mismatch (`change_me_redis` vs `root`) | **No** — same desync class |
| `15061` SIP proxy | Stale lab `.env` line; pack/agent residue | **No** — Start should ship correct `5061` |

So: **repack / deploy-env on a dirty lab** broke Start. Repair MOBS fixed the mess. They are **not** the product ritual.

---

## What Start must mean (locked intent)

Same as `MOB-DISC-AI-ENGINE-PACK-NOT-MANUAL-UVICORN-20260807.md`:

- **One** Start (service or bat) brings Fleet + required engines (WVP stack if handoff on).  
- Secrets in `.env` **match** the volumes created on **first** install.  
- Re-Start on same PC = stop/start containers **without** inventing new passwords.  
- Pack scripts must **not** overwrite lab/customer `.env` passwords onto old volumes without a clear “reset data” warning.

Partner virgin PC (empty Docker volumes + pack `.env` written once) is the happy path. **This lab** is the hard path because volumes already existed.

---

## Recommendation (one next APPLY when you want product hardening)

Not now unless you say so:

`MOB-APPLY LAB-START-NO-SECRET-DESYNC-V1` (name can change)

Scope idea:

1. Start / Setup: if catalog auth fails, **operator-facing** message (“database password mismatch — run repair / reinstall”) — no silent crash-loop into PAUSED without hint.  
2. Ban pack agents from rewriting `FM_CATALOG_DB_URL` / `WVP_*` passwords on an already-running lab without named APPLY.  
3. Optional: `START-WVP-LAB` / enterprise compose read **one** password source and refuse up if Redis/DB disagree.

Until that: **daily use** = `RESTART-FLEET.bat` (or service) + WVP already up.  
Only re-run bring-back if another pack/agent trashes volumes again.

---

## Standing

You do **not** owe customers this ritual.  
You do **not** need to re-do bring-back every morning if nothing rewrote Docker secrets.
