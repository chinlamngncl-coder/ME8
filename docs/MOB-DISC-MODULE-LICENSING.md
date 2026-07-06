# MOB DISC — Module licensing (BWC · VC · Face · ANPR · Weapon)

**Status:** DISC only — extends existing **platform license** model.  
**Audience:** Ubitron ship desk (you issue before customer zip leaves).  
**Parent:** `docs/LICENSE-OPERATIONS.md`, `MOB-DISC-ANALYTICS-LICENSE-HUB.md`  
**Search:** `module license`, `analytics face seats`, `grey until licensed`, `LicenseIssuer`

---

## Yes — same licensing family as BWC

**One concept, one file, vendor-signed before ship:**

| Today | Target |
|-------|--------|
| `storage/platform-license.json` caps **BWC count** + dashboard users | Same file adds **optional modules** |
| `maxBwcDevices` | Unchanged — how many BWCs can register |
| VC = build flag `-VideoConference` on customer pack | Move to license module `videoConference` |
| Analytics = grey UI only (planned) | License fields `analyticsFace`, `analyticsAnpr`, `analyticsWeapon` |

Customer servers **verify only** — cannot issue licenses.  
You issue in-house from **LicenseIssuer** (confidential vendor tree) before `BUILD-ME8-CUSTOMER.ps1`.

---

## The three analytics modules (separate purchasable)

Each module is **independent** — client can buy any combination:

| Module key | Product name | License unit | Grey when |
|------------|--------------|--------------|-----------|
| `analyticsFace` | Face recognition | **Per source** (BWC or fixed camera) | `maxSources: 0` or missing |
| `analyticsAnpr` | ANPR | **Per source** | same |
| `analyticsWeapon` | Weapon detection | **Per source** | same |

**Per source** = one BWC or one camera channel enabled for that analytics type.

Examples:

- Customer buys **10 Face** → license `analyticsFace.maxSources: 10` → assign up to 10 devices in Settings  
- Later buys **+5 Face** → re-issue license with `15` → replace file → restart  
- ANPR **0** → ANPR tab **grey**: *“Not licensed”*  
- Face **10** but only **3** assigned → 3 active, 7 seats free (shown in Settings)

Weapon same model — usually **0** on default ship.

---

## Full module map (what Ubitron licenses)

```
Platform license (one signed file per site)
├── Core (always)
│   ├── maxBwcDevices          ← BWC fleet cap (existing)
│   └── maxDashboardUsers      ← operators (existing)
├── videoConference            ← VC tab / LiveKit SKU
│   ├── enabled: true|false
│   └── maxConcurrentRooms?    ← optional cap (v2)
├── analyticsFace
│   ├── enabled: true|false
│   └── maxSources: N
├── analyticsAnpr
│   ├── enabled: true|false
│   └── maxSources: N
└── analyticsWeapon
    ├── enabled: true|false
    └── maxSources: N
```

**Grey-until-licensed rule (UI):**

| Nav / tab | Gate |
|-----------|------|
| Operations / Evidence / Audit | Core — always (if user has role) |
| Video Conference | `videoConference.enabled` |
| Analytics → Face | `analyticsFace.maxSources > 0` |
| Analytics → ANPR | `analyticsAnpr.maxSources > 0` |
| Analytics → Weapon | `analyticsWeapon.maxSources > 0` |

No license → grey panel + one sentence. **No dead buttons.**

---

## Proposed license file shape (MOB to implement)

Extends signed payload in `lib/platformLicense.js` (canonical keys + signature):

```json
{
  "licenseId": "UB-2026-ACME-001",
  "customerName": "Acme Police Region",
  "type": "perpetual",
  "maxBwcDevices": 50,
  "maxDashboardUsers": 30,
  "issuedAt": "2026-07-06T00:00:00.000Z",
  "expiresAt": "2036-12-31T23:59:59.999Z",
  "modules": {
    "videoConference": { "enabled": true },
    "analyticsFace": { "enabled": true, "maxSources": 10 },
    "analyticsAnpr": { "enabled": true, "maxSources": 5 },
    "analyticsWeapon": { "enabled": false, "maxSources": 0 }
  },
  "signature": "<hex vendor signature>"
}
```

- **Perpetual tender:** `type: perpetual` + long `expiresAt` (re-issue to renew limits, same as today).  
- **Subscription rental:** shorter `expiresAt` (existing model).  
- Editing JSON without signature → **server refuses start** (existing security).

---

## Runtime enforcement (after MOB)

| Check | When |
|-------|------|
| BWC register | `fleet count < maxBwcDevices` (today) |
| VC join / create room | `modules.videoConference.enabled` |
| Face ingest / analyse on device X | device X in **assigned face slots** ≤ `maxSources` |
| ANPR on camera Y | same for ANPR slots |
| Analytics tab visible | super-admin sees all tabs; operators see licensed tabs only |

**Assignment UI (super-admin):** Settings → Licenses → assign which BWC/camera IDs consume each module seat (like dispatch groups).

---

## Ship desk — how **you** issue before customer gets zip

**Confidential — same place as today** (see `docs/LICENSE-OPERATIONS.md`):

```
MobilityC2-VENDOR-IMPORTANT\LicenseIssuer\
  issue-license.js      ← extended with module flags
  verify-license.js
  keys\license-private.pem   ← NEVER on customer media
  issued\                    ← keep every file you sign
```

### Teach-us workflow (secret = vendor desk only)

**Step 1 — One-time (already documented)**  
Generate key pair → export public key into ME8 build.

**Step 2 — Per contract (you do this before ship)**

```powershell
cd "...\MobilityC2-VENDOR-IMPORTANT\LicenseIssuer"

node issue-license.js `
  --customer "Example Customer" `
  --type perpetual `
  --bwc 50 `
  --users 30 `
  --expires 2036-12-31 `
  --vc `
  --face 10 `
  --anpr 5 `
  --weapon 0 `
  --out issued\example-customer-platform-license.json

node verify-license.js issued\example-customer-platform-license.json
```

**Step 3 — Bake into customer pack**

```powershell
cd "...\ME8"
.\BUILD-ME8-CUSTOMER.ps1 `
  -CustomerName "Example Customer" `
  -LicensePath "...\issued\example-customer-platform-license.json" `
  ...
```

**Step 4 — Ship checklist (add rows)**

1. Contract modules match `--face` / `--anpr` / `--weapon` / `--vc`  
2. `verify-license.js` pass  
3. Staged pack has **no** private key  
4. `ship-registry.csv` row: BWC cap + face seats + ANPR seats + VC yes/no  
5. Customer never runs `issue-license.js` — only `RESTART-FLEET.bat`

**Upgrade later:** new signed file with higher `--face 15` → replace `storage/platform-license.json` → restart. No cloud phone-home.

---

## What customer sees vs what you control

| Customer super-admin | Ubitron ship desk |
|----------------------|-------------------|
| Settings → License **status** (read-only): seats used / total | Issues signed file |
| Assign which BWCs use Face / ANPR seats | Sets maxSources in contract |
| Grey tabs for unpurchased modules | Leaves modules at 0 or omits |
| Cannot forge or raise caps | Holds private signing key |

---

## Tender / brochure lines

- *“Core VMS and BWC capacity are licensed per installation; optional modules include video conference, face recognition, ANPR, and weapon detection.”*  
- *“Analytics modules are licensed per camera or body-worn source; the customer may purchase additional sources at any time.”*  
- *“Unlicensed modules remain visible but inactive until a vendor-signed entitlement file is applied.”*

---

## MOB implementation waves (license code)

| MOB | Risk | Delivers |
|-----|------|----------|
| `mob-platform-license-modules` | **2** | Extend `platformLicense.js` + issuer CLI + `/api/platform/status` module block |
| `mob-vc-license-gate` | **2** | VC tab grey unless `videoConference.enabled` (replace build-only SKU over time) |
| `mob-analytics-hub-shell` | **2** | Analytics grey + read license seats |
| `mob-analytics-seat-assign` | **3** | Settings UI assign BWC/cam to face/anpr/weapon slots |

**Do not** put private key or issuer scripts on customer USB.

---

## Answers to your questions

| Question | Answer |
|----------|--------|
| Same as BWC licensing? | **Yes** — same signed `platform-license.json`, vendor issues before ship |
| Face / ANPR / Weapon separate? | **Yes** — three module blocks, separate `maxSources` |
| Buy as many sources as they want? | **Yes** — you set count at issue time; re-issue to add seats |
| Controlled in-house before shipping? | **Yes** — LicenseIssuer + BUILD pack; customer verify-only |
| Teach us to do it ourselves? | **Yes** — `LICENSE-OPERATIONS.md` + extended `issue-license.js` flags above; practice on lab pack first |

---

## Related docs

- `docs/LICENSE-OPERATIONS.md` — current BWC issuer SOP (extend with module flags when MOB lands)  
- `docs/MOB-DISC-ANALYTICS-STACK-UX.md` — what operators see when licensed  
- `docs/MOB-DISC-ANALYTICS-LICENSE-HUB.md` — Analytics hub behaviour  

Reply **`MOB-APPLY mob-platform-license-modules`** when you want the license file schema + issuer CLI extended (low risk, no analytics engine).
