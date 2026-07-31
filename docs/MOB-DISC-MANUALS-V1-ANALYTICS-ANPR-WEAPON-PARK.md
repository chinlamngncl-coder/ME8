# MOB DISC — ANPR & weapon detection manuals: now or after analytics finish?

**Date:** 2026-07-29  
**Status:** **LOCKED recommendation** — park dedicated ANPR / weapon manuals until analytics software PASS  
**Search:** ANPR, weapon detection, Analytics manuals, park until product finish  
**Related:** Writing standards (exact UI sync) · User Manual Analytics chapter · license features `analyticsAnpr`, `analyticsWeapon`

---

## Plain answer

**Yes — finish the analytics software first. Update / expand manuals later.**

Do **not** write full ANPR or weapon-detection manuals (or deep User chapters) while those modules are still being built. The live UI still shows placeholder / coming states for ANPR and weapon detection. Manuals written now would invent steps or go stale the week the UI lands.

---

## Why wait (risk)

| Fact today | Manual risk if we write now |
|------------|------------------------------|
| Product gate text lists face, ANPR, weapon as optional modules | OK as one sentence |
| ANPR / weapon screens still “coming when licensed” style | Full procedures would be fiction |
| Writing standards Rule 3: exact July UI sync | Cannot sync buttons that are not final |
| You are about to build ANPR and weapons | Labels, tabs, and workflows will change |

**Industry pattern:** Ship operator docs for a module after the module’s UI and license behaviour are stable — not during the build.

---

## What manuals already say (enough for now)

| Manual | Current Analytics wording |
|--------|---------------------------|
| Quick Start | Tab name **Analytics** only |
| User Manual | Open **Analytics**; use licensed modules (face / plate example); locked → ask admin |
| Technical Manual | Optional analytics (face, plate, or weapon) when licensed |

That is **enough** until product PASS. No new Analytics manual book required yet.

---

## Decision (one path)

| Phase | Do |
|-------|-----|
| **Now** | Build ANPR + weapon detection in software. Leave manuals alone (except unrelated PASS items you already ordered). |
| **After analytics feature PASS** | One named MOB: expand **User Manual → Analytics** (and Tech entitlement note if needed) with exact tab names **ANPR**, **Weapon detection**, real steps, locked vs licensed, screenshots. |
| **Do not** | Create separate “ANPR Manual” / “Weapons Manual” books unless sales requires a standalone SKU guide later. Prefer one **Analytics** chapter with subsections. |

**Recommended APPLY later (not now):**  
`MANUALS-V1-ANALYTICS-ANPR-WEAPON-SYNC-V1`  
Trigger: operator says analytics ANPR + weapon detection **PASS** (or UI frozen), then **go ahead**.

Also locked (pack + notice): `docs/MOB-DISC-ANALYTICS-PACK-LIKE-FR-AND-PUBLIC-NOTICE-AFTER-WEAPONS-20260729.md` — engines ship like FR; **public notice after weapons PASS**.

---

## First-mention style (when that MOB runs)

Same pattern as CAD / RMS:

- First time: **ANPR** (Automatic Number Plate Recognition) — optional analytics module…  
- First time: **Weapon detection** — optional analytics module…  
- Then short forms in that manual.

Exact sentences locked when the UI is final — not today.

---

## Manuals genre order (updated)

1. Finish User / Quick Start PASS if still pending  
2. **You:** finish analytics software (ANPR + weapons)  
3. Then manuals: Analytics sync MOB  
4. Then Managed Cloud / Hybrid / Migration / screenshots as ordered  

Do not block software work waiting on manuals.

---

## Lock record

| Question | Answer |
|----------|--------|
| Update manuals for ANPR/weapons now? | **No** |
| New standalone manuals now? | **No** |
| When? | After analytics software / UI **PASS** |
| Next manuals MOB name | `MANUALS-V1-ANALYTICS-ANPR-WEAPON-SYNC-V1` when ordered |
| Edits now | **None** |
