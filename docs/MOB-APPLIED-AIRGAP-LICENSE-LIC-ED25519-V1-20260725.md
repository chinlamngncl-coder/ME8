# MOB-APPLIED — Air-gapped license.lic (Ed25519) generator + boot validator

**Date:** 2026-07-25  
**MOB:** `AIRGAP-LICENSE-LIC-ED25519-V1`  
**Phase:** 3 Task 3.1  
**Operator:** **PASS** (2026-07-25) — `npm run verify:airgap-license` OK  

## Mechanism

- **Asymmetric:** Ed25519 (matches existing ME8 `licenseVerifyKey` / vendor issuer family; no RSA second stack)  
- **Private key:** offline only (`tools/generate-license.js --gen-keys`) — never in customer zip  
- **Public key:** `keys/license-public.pem` or `FM_LICENSE_PUBLIC_KEY` or embedded `lib/licenseVerifyKey.js`  
- **File:** `storage/license.lic` (also checks repo-root `license.lic`)

### Payload

```json
{
  "customerName": "…",
  "hardwareId": "<sha256-mac-fingerprint 32 hex>",
  "expiryDate": "2027-12-31",
  "maxFixedCameras": 32,
  "maxBwcDevices": 64,
  "features": { "tacticalOverwatch": true }
}
```

Signed as `{ v, alg: "Ed25519", payload, signature }` (canonical JSON + detached Ed25519).

## Generator (offline)

```powershell
node tools/generate-license.js --print-hwid
node tools/generate-license.js --gen-keys --keys-dir .\keys
node tools/generate-license.js `
  --private-key .\keys\license-private.pem `
  --customer "Acme" `
  --hardware-id <hwid> `
  --expiry 2027-12-31 `
  --max-fixed-cams 32 `
  --max-bwc 64 `
  --feature tacticalOverwatch `
  --out .\issued\acme-license.lic
```

## Validator + boot

`lib/licenseManager.js` → `validateOnBoot()` in `server.js` **before** SIP/HTTP/video start.

On fail: logs / prints **`LICENSE EXPIRED OR INVALID`** and `process.exit(1)` (Web / SIP / Video never bind).

Checks: signature, `hardwareId` vs `os.networkInterfaces()` MAC fingerprint, `expiryDate`.

### Lab vs ship

| Env | Behaviour |
|-----|-----------|
| No `license.lic`, `FM_AIRGAP_LICENSE_REQUIRED` unset/0 | Lab OK (optional) |
| `license.lic` present but bad | **Always refuse** |
| `FM_AIRGAP_LICENSE_REQUIRED=1` | Missing file also refuses (customer ship) |

Existing `platformLicense` / `platform-license.json` still runs after this gate.

**Verify:** `npm run verify:airgap-license`  
**HWID:** `npm run license:print-hwid`

## Smoke (plain)

1. `npm run license:print-hwid`  
2. (Optional) gen keys + sign a `.lic` for this HWID → copy to `storage/license.lic` → restart OK  
3. Edit signature / wrong HWID / past expiry → restart must die with **LICENSE EXPIRED OR INVALID**  

Say **PASS** or **FAIL**. **Do not start Task 3.2** until review.
