# MOB DISC — FINAL SHIP: NEVER pack trial_wildcard (priority reminder)

**Date:** 2026-07-31  
**Status:** LOCKED for **commercial / final SHIP** — see also two-lane update  
**Also read:** `MOB-DISC-SHIP-VS-TRIAL-PACK-WILDCARD-REMIND-20260731.md` (ship = no wildcard; **trial pack** = wildcard OK when named; remind every pack ask)  
**Operator (original):** *100% do not do that (trial wildcard) for final ship packing.*  
**Action:** Paper lock only. No code in this disc.

---

## Plain English (memorize)

**Commercial / final customer pack must NEVER ship `hardwareId: trial_wildcard`.**

| Allowed | Forbidden on final ship |
|---------|-------------------------|
| Signed `license.lic` for **that server’s real HWID** | `trial_wildcard` / any “runs on any PC” license |
| Expiry + features matching the **contract** | “Partner had no HWID so we left wildcard in the zip” |
| Private key **offline only** | Private key or generate-license in the customer zip |

**Partner trial with no HWID** = temporary lab/partner bridge only.  
**Final ship / paid / production USB** = host-locked license **or the pack does not leave**.

No excuse. No “just this once.” No “China was in a hurry.”

---

## When AI / ship desk must print this

Whenever operator says any of:

- ship / pack / customer pack / CREATE ship / packing checklist / send to client / PH KR / CN delivery zip / final pack  

AI must treat this as **priority gate** next to classic pre-ship:

1. **Confirm license is NOT trial_wildcard**  
2. Confirm `license.lic` (or pack master) HWID = **customer machine HWID**  
3. Confirm expiry / features match contract  
4. Confirm **no** `license-private.pem` in zip  

If wildcard is still in the pack → **STOP. Do not zip. Do not declare ready.**

---

## Related locks

- Air-gap verify: `licenseManager.js` (wildcard exists for **trial tooling only** — not a ship SKU)  
- Commercial pack = new install: `MOB-DISC-COMMERCIAL-PACK-NEW-NO-PORT-RELIGION-20260731.md`  
- License plain English: `MOB-DISC-LICENSE-LAB-VS-COMMERCIAL-CRACK-PLAIN-20260731.md`  
- Pre-ship gate / pack gather (print at pack time only — no daily nag)

---

## Lock

**FINAL SHIP = host-locked license only.**  
**trial_wildcard = never in final customer pack.**  
Operator order is absolute.
