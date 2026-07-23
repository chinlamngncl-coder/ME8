# MOB DISC — What is Valkey for? Legal / commercial time-bomb check

**Status:** DISC 2026-07-22  
**Mode:** Paper only — **no code** until a named `MOB-APPLY`  
**Search:** `valkey backup`, `valkey legal`, `redis SSPL`, `postgres license`, `time bomb`, `commercial rights`  
**Operator ask:** What is Valkey a backup for? We want enterprise ship **without legal/commercial landmines**. SQL/Postgres already checked? Replace anything dirty next.

---

## Straight answers (plain English)

### 1) Valkey is **not** a backup of your videos / evidence / redacted files

| Thing | What Valkey is | What Valkey is **not** |
|-------|----------------|-------------------------|
| Role | Optional **runtime cache** for Fleet GPS / online / SIP contact | Evidence store, redaction store, legal archive |
| If Valkey dies | App keeps running on **memory + JSON** (`last-gps.json`, `last-sip-contact.json`) | Does **not** erase Evidence / redacts |
| Evidence / redacts | Live on disk under `storage\…` (+ Postgres catalog metadata) | Never depend on Valkey |

**One line:** Valkey = fast scratchpad for “where is the BWC / last GPS / last SIP address.”  
**Not** “backup of the case file.”

### 2) If you heard “backup” inside Valkey

Compose turns on Valkey **RDB/AOF persistence** (`--save` / `--appendonly`) so **cache keys** can survive a Valkey container restart. That is **cache durability**, not legal evidence backup. Losing Valkey data is annoying (cold GPS/contact until devices re-report) — it is **not** losing recordings.

### 3) Why we have Valkey at all (product goal)

Google / enterprise plan: split **runtime state** (hot, replaceable) from **catalog** (Postgres) and **files** (disk).

```
BWC / SIP / map
      │
      ├─ memory + JSON     ← always works (lab default if FM_REDIS_URL unset)
      ├─ Valkey (optional) ← share / recover hot state faster across restarts
      └─ Postgres          ← durable catalog (evidence index, registry, audit)
```

SOS / live / PTT must **never** wait on Valkey. That is locked in Wave-2 / `VALKEY-FLEET-RUNTIME-STATE-DEGRADE-V1`.

---

## Legal check — have we checked SQL / Postgres / Valkey?

**Yes for the Fleet enterprise pair.** Prior audit: `docs/google-feedback-discussion/06-OPEN-SOURCE-LICENSE-AUDIT.md` (Redis SSPL → Valkey BSD resolved 2026-07-07). Re-checked against current stack 2026-07-22:

| Component | Where used | License | Commercial OEM / on-prem ship | Verdict |
|-----------|------------|---------|-------------------------------|---------|
| **PostgreSQL 16.10** | Enterprise catalog (`mobility-postgres`) | **PostgreSQL License** (BSD-like permissive) | Yes — attribution in legal notices | **CLEAN** |
| **`pg` (node-postgres)** | `package.json` → catalog client | **MIT** | Yes | **CLEAN** |
| **Valkey 8** (`valkey/valkey:8-alpine`) | Fleet enterprise compose only | **BSD-3-Clause** (Linux Foundation) | Yes — attribution | **CLEAN** (this is why we forked away from Redis CE) |
| **`ioredis`** | Fleet Node client to Valkey | **MIT** | Yes | **CLEAN** |
| Protocol name `redis://` in env | URL scheme only | N/A | Descriptive “Redis-compatible” OK; do **not** brand product as Redis | **OK if wording careful** |

### Why not Redis CE (the time bomb we already dodged for Fleet)

| Redis line | License reality | Risk for Axiom OEM |
|------------|-----------------|--------------------|
| Redis ≤ **7.2** | BSD-3-Clause | Historically OK |
| Redis **7.4–7.8** | **RSALv2 / SSPLv1** (source-available, **not** classic OSI “do anything”) | Customer counsel / Google review friction; “hosted DB” clauses scare enterprises |
| Redis **8+** | RSALv2 / SSPLv1 / **AGPLv3** options | AGPL = copyleft landmine many enterprises **ban** |

**Valkey exists because Redis Ltd changed the license.** We use Valkey so Mobility Axiom does **not** ship Redis Ltd’s newer terms for the Fleet cache.

Counsel still owns final sign-off; this disc is engineering’s pin of **intent + current images**.

---

## Remaining time bombs (honest — not panic)

Fleet Valkey + Postgres are the **clean** path. These still need a later named MOB if you want zero Redis-brand / SSPL debate in the whole lab:

| Stack | Today’s image | Risk | Severity |
|-------|---------------|------|----------|
| **LiveKit** (`docker/livekit.compose.yaml`) | `redis:7-alpine` (**floating** tag) | Floating `7-alpine` can pull a **7.4+** build under SSPL/RSAL without anyone noticing | **Medium — real time bomb** |
| **WVP lab** (`docker/wvp/…`) | `redis:7-alpine` | Same floating-tag risk; lab-only today but often left running | **Medium (lab)** → High if shipped as customer kit |
| Product docs saying “Redis” loosely | Mix of “Redis URL” / Valkey | Trademark / customer confusion | **Low** if we say “Valkey (Redis-compatible)” |
| MinIO (if ever bundled as server) | AGPL | Separate — already flagged in audit §4 | Don’t silently add |
| Seeta / FR engines | Per FR legal discs | Separate genre | Don’t mix into this MOB |

**Not a Valkey problem.** Valkey is the **fix** for Fleet. The leftover risk is **other compose files still pulling Docker Hub `redis:7-alpine`.**

---

## What we want to attain (locked intent)

1. **No legal/commercial surprise** in customer pack for Fleet enterprise services.  
2. **Permissive** server licenses preferred: PostgreSQL License, BSD-3-Clause, MIT, Apache-2.0, LGPL FFmpeg (already handled).  
3. **Avoid** SSPL / RSAL / AGPL in anything we **ship or recommend** as part of Axiom.  
4. Replace dirty pieces **next** with a named MOB — not silent swaps mid-genre.  
5. Valkey stays **optional**; unset `FM_REDIS_URL` = no Valkey dependency (no “must buy Redis”).

---

## Recommended next MOB (one path — agent pick)

**Name:** `ENTERPRISE-REDIS-IMAGE-LEGAL-PIN-V1`

**Do:**

1. LiveKit compose: replace `redis:7-alpine` → **`valkey/valkey:8-alpine`** (or pin `redis:7.2.x-alpine` **only if** LiveKit docs require Redis binary name — prefer Valkey).  
2. WVP lab compose: same swap to Valkey (or pin 7.2.x if a WVP image hard-requires `redis-server` binary name — test once).  
3. Pin **digest or minor version** in compose comments so tags cannot silently jump to SSPL.  
4. Doc + legal notices: “LiveKit/WVP use Valkey (Redis-compatible); Fleet uses Valkey.”  
5. Smoke: LiveKit up, WVP up, Fleet Valkey optional — SOS/live/PTT unchanged.

**Do not:**

- Make Fleet Valkey mandatory  
- Touch evidence / redact paths  
- Re-open FFmpeg / Seeta in this MOB  

**Risk:** Low–medium (compose + one smoke). Legal risk **drops** after pin/swap.

---

## Operator checklist (no tech required)

| Question | Answer |
|----------|--------|
| Is Valkey my video backup? | **No.** |
| Is Postgres my legal catalog? | **Yes** (metadata); files still on disk. |
| Is Fleet Valkey legally dirty? | **No** — BSD-3-Clause + MIT client. |
| Is Postgres dirty? | **No** — PostgreSQL License. |
| Any time bomb left? | **Cleared for active compose** — LiveKit + WVP + Fleet use Valkey (`ENTERPRISE-REDIS-IMAGE-LEGAL-PIN-V1`). Baselines may still show old Redis tags historically. |
| Can we ship without Valkey? | **Yes** — leave `FM_REDIS_URL` unset. |

---

## Related

- `docs/google-feedback-discussion/06-OPEN-SOURCE-LICENSE-AUDIT.md`  
- `docs/MOB-APPLIED-VALKEY-FLEET-RUNTIME-STATE-DEGRADE-V1-20260722.md`  
- `docs/ME8-ENV-ENTERPRISE.md`  
- `public/legal-notices.html` (Valkey + Postgres + ioredis + pg listed)

---

## Ask

When you want the leftover Redis images cleaned:  
**`MOB-APPLY ENTERPRISE-REDIS-IMAGE-LEGAL-PIN-V1`**
