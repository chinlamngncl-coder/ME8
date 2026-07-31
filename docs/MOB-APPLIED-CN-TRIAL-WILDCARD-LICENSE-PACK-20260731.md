# MOB APPLIED — CN trial wildcard license + enterprise zip

**Date:** 2026-07-31  
**Operator:** Unblock Step 5 pack without partner HWID; 365-day trial; finish zip  
**Status:** APPLIED — zip created

---

## What changed

| Item | Detail |
|------|--------|
| `lib/licenseManager.js` | `hardwareId: trial_wildcard` (alias `TRIAL_WILDCARD` / `hwid`) skips MAC match; **expiry still mandatory** (`expiryDate` / `expiration_date`) |
| Root `master_license.json` | Signed Ed25519 trial: 20 BWC, 10 IPC, all commercial features, expiry **2027-08-29** |
| Packer | Copy license with `Copy-Item` (no UTF-8 BOM — BOM broke `JSON.parse`) |
| `build:ship` | Rebuilt so protected `run.js` includes trial wildcard |
| Zip | `dist/Mobility_Axiom_Deploy.zip` |

**Signer:** `MobilityC2-VENDOR-IMPORTANT\LicenseIssuer\keys\license-private.pem` (matches embedded public key).  
**Not in zip:** private key / `generate-license.js`.

---

## Partner note

When real HWID is known, re-issue a host-locked `license.lic` and replace `storage/license.lic` (do not leave wildcard on production forever).
