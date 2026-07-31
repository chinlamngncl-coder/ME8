# MOB APPLIED — CN partner enterprise pack scaffolding (Steps 1–6)

**Date:** 2026-07-31  
**Operator request:** China partner deploy package — one-click setup, GB ID fix, Jiangsu/zh, zip  
**Status:** APPLIED — `dist/Mobility_Axiom_Deploy.zip` created (2026-07-31) with trial wildcard `master_license.json` (20 BWC / 10 IPC / expiry 2027-08-29). See also `MOB-APPLIED-CN-TRIAL-WILDCARD-LICENSE-PACK-20260731.md`.

---

## PACK GATHER / PRE-SHIP (print)

```
1) Licensing — HWID on partner server → sign license → FM_AIRGAP_LICENSE_REQUIRED=1
2) build:ship → ship-build/protected
3) No license-private.pem in zip
4) PRE-SHIP: Node 22+, multer, root Start/Install, smoke
```

---

## What was done

| Step | Result |
|------|--------|
| **1 GB IDs** | Removed hardcoded `440102…` from WVP compose / application-modern.yml / `wvpRegisterMirror.js`. Defaults: `GB_PLATFORM_ID=99999900002000000001`, `GB_DOMAIN=9999990000`. |
| **2 Jiangsu / zh** | Map fallbacks + `cn` preset → **32.0617, 118.7630**. `fm-locales` / `fm-default-lang=zh`. Offline-only injected **into deploy zip HTML** (not forced on lab OSM). |
| **3 One-click** | Root `Axiom_Enterprise_Setup.bat` + `axiom_setup.sh` + `scripts/Set-DeployHostEnv.ps1` + `.env.deploy.example`. |
| **4 Security** | Packer purges `*private*.pem`, `.env`, generate-license from **staging only**. Enforces `FM_AIRGAP_LICENSE_REQUIRED=1` in deploy env template. |
| **5 License** | Packer copies `master_license.json` → `storage/license.lic` and/or `platform-license.json`. **File currently MISSING at repo root — STEP 5/6 cannot finish.** |
| **6 Bundle** | `scripts/PACK-CN-AXIOM-ENTERPRISE.ps1` → `dist/Mobility_Axiom_Deploy` + `.zip`. |

---

## Command (run after placing license)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
# REQUIRED first:
#   copy your signed partner license to .\master_license.json
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\PACK-CN-AXIOM-ENTERPRISE.ps1
```

---

## Honest blockers

1. **`master_license.json` is not in the workspace** — cannot unlock 20 BWC / 10 IPC without it.  
2. **`data/gis/offline` empty** — CN offline maps need tiles or map stays blank after offline meta inject.  
3. Lab UI now defaults **zh** + Jiangsu coords in source — if lab should stay EN/SG, say so and we revert source defaults to pack-only.
