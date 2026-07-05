# Platform license — ME8 internal operations (Ubitron ship desk)

**Audience:** Ubitron technical staff (installers, sales engineering, support)  
**Not for end-customer dispatchers** — they never issue, edit, or see license tooling.

**Issue licenses (management / senior tech only):**

`C:\Users\user\Desktop\Enterprise Mobility\MobilityC2-VENDOR-IMPORTANT\LicenseIssuer\`

ME8 on customer servers **verifies only** — it cannot generate licenses. `scripts/issue-license.js` is a stub that points here.

---

## What the license controls

Each customer site (one ME8 node) holds **one signed file**:

`storage/platform-license.json`

The server checks it at **startup** and enforces:

| Field | Effect |
|-------|--------|
| `maxBwcDevices` | Hard cap on BWC rows |
| `maxDashboardUsers` | Hard cap when creating dashboard users |
| `expiresAt` | **Required** — server **refuses to start** after this date |
| `type: perpetual` | Sold — use a **long** expiry (e.g. 10 years); renew by re-issuing |
| `type: subscription` | Rental — shorter expiry |
| `customerName` | Label on license (internal status APIs) |

When a valid license is present, **license limits win** over `.env` caps.

If anyone edits `platform-license.json` without a valid signature, the server **refuses to start**.

---

## When a license is required

| `.env` | Behaviour |
|--------|-----------|
| Valid `storage/platform-license.json` | Limits from license; startup OK |
| `FM_RENTAL_MODE=1` | **License required** — missing/invalid blocks startup |
| `FM_LICENSE_REQUIRED=1` | Force license even without rental mode |
| Neither set (ME8 lab bench) | License optional; `FM_MAX_*` env limits apply |
| `FM_LICENSE_REQUIRED=0` | **Internal dev only** — skip check |

Enterprise customer packs from `BUILD-ME8-CUSTOMER.ps1` always include a signed license file.

---

## Vendor license tool (CONFIDENTIAL — never on customer media)

```
C:\Users\user\Desktop\Enterprise Mobility\MobilityC2-VENDOR-IMPORTANT\
  !!! READ FIRST — CONFIDENTIAL VENDOR TOOLS.txt
  LicenseIssuer\
    generate-keys.js           ← once per key lifetime
    export-public-to-server.js ← push public key into ME8 build
    issue-license.js           ← sign each customer
    verify-license.js
    issued\                    ← store every issued file here
    keys\license-private.pem   ← NEVER ship to customer
```

Public key on ME8 ship tree: embedded in `lib/licenseVerifyKey.js` (verify-only).

### First-time key setup

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\MobilityC2-VENDOR-IMPORTANT\LicenseIssuer"
node generate-keys.js
node export-public-to-server.js --server "C:\Users\user\Desktop\Enterprise Mobility\ME8"
```

Back up `keys\license-private.pem` offline (encrypted USB / vault).

### Issue a license (per customer / contract)

**Sold (perpetual):**

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\MobilityC2-VENDOR-IMPORTANT\LicenseIssuer"

node issue-license.js `
  --customer "Acme Security Ltd" `
  --type perpetual `
  --bwc 8 `
  --users 50 `
  --expires 2036-12-31 `
  --out issued\acme-platform-license.json

node verify-license.js issued\acme-platform-license.json
```

**Rental (subscription):**

```powershell
node issue-license.js `
  --customer "RentCo Site 1" `
  --type subscription `
  --bwc 200 `
  --users 20 `
  --expires 2027-06-01 `
  --out issued\rentco-platform-license.json
```

Log the row in `pack\me8-ship\ship-registry.csv` (copy from `ship-registry.template.csv`).

---

## Build customer pack (license baked in)

After `verify-license.js` passes:

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"

.\BUILD-ME8-CUSTOMER.ps1 `
  -OutRoot "C:\ME8-Ship-Staging\Acme" `
  -CustomerName "Acme Security Ltd" `
  -LanIp "10.0.0.50" `
  -LicensePath "C:\Users\user\Desktop\Enterprise Mobility\MobilityC2-VENDOR-IMPORTANT\LicenseIssuer\issued\acme-platform-license.json"
```

Optional VC SKU: add `-VideoConference`.

This copies the license to `storage\platform-license.json`, writes bootstrap profile, runs `npm install`, and `VERIFY-ME8-FRESH.ps1`.

---

## Ship desk checklist (before zip leaves Ubitron)

1. Contract limits match `--bwc` and `--users` on issued license  
2. `node verify-license.js` on issued file — pass  
3. `BUILD-ME8-CUSTOMER.ps1` — pass  
4. `VERIFY-ME8-FRESH.ps1` on staged pack — pass  
5. Pack contains **no** `license-private.pem`  
6. Row added to `pack\me8-ship\ship-registry.csv`  
7. Partner handoff: **`HANDOFF-SHEET.txt`** + **`SETUP-ME8.bat`** + **`CUSTOMER-START.txt`**  

---

## Renewal / upgrade

1. Issue new file with later `--expires` and/or higher limits  
2. Replace `storage\platform-license.json` on site **or** ship new pack  
3. `RESTART-FLEET.bat`

Online activation is **not** built — file replacement is the system.

---

## Verify on a running site

Signed in as super admin:

```
GET /api/platform/status
```

Expect `license.valid: true`, `limitsSource: "license"`, entitlements matching contract.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Platform license required` | Issue from **LicenseIssuer**; rebuild pack or copy to `storage/` |
| `signature does not match` | Re-issue; never hand-edit JSON |
| `License expired` | Re-issue with later `--expires` |
| `No license public key` | Run `export-public-to-server.js --server` on ME8 tree |
| `scripts/issue-license.js` on customer server | Stub only — use **LicenseIssuer** on ship desk |

---

## Security model

| Location | Private key? | Can issue? |
|----------|--------------|------------|
| **MobilityC2-VENDOR-IMPORTANT** | Yes | Yes |
| **ME8 customer pack** | No | No — verify only |

---

## Related

- `MobilityC2-VENDOR-IMPORTANT\LicenseIssuer\README.md` — full issuer guide  
- `pack\me8-ship\ship-registry.template.csv` — internal ship log  
- `pack\me8-fresh\customer-ship-manifest.example.json` — BUILD manifest example  
