# MOB DISC — What we would commit/push next (lab first) — exact batches

**Date:** 2026-07-31  
**Status:** DISC only — **NO commit. NO push. NO product edits.**  
**Operator:** *Then what are we committing and pushing? Give details.*  
**Also locked:** China pack **parked** (`MOB-DISC-STOP-CN-PACK-OWN-LAB-FIRST-20260731.md`) — **exclude** from these batches.

---

## Rule (so agent does not “just push” again)

1. This disc = **menu + file lists**.  
2. Push only after you type e.g. **`MOB-APPLY lab-git-push-anpr-sidecar`** (one genre).  
3. Agent then commits **only that genre’s paths** and pushes.  
4. Saying “Mob disc” alone ≠ push.

---

## Already on GitHub (do not re-push as new work)

**Commit `7fa58b3`** already has:

- ANPR Live UI: `anpr-live-watch.js`, `anpr-plate-cropper.js`, `analytics-hub.js`, poller/libs, `global.css`, `index.html`, `login.html`, `mobility-map-gis.js`
- Some ANPR Live + lab-restore **docs**

That slice is **done** on remote. Next pushes are for what is **still local**.

---

## EXCLUDE forever from “lab first” pushes (China parked)

Do **not** put these in lab pushes until you reopen CN:

| Path / area | Why |
|-------------|-----|
| `scripts/PACK-CN-AXIOM-ENTERPRISE.ps1` | CN packer |
| `scripts/Set-DeployHostEnv.ps1` | CN/deploy host helper (pack-tied) |
| `Axiom_Enterprise_Setup.bat`, `axiom_setup.sh` | CN one-click |
| `master_license.json` | Partner trial license asset |
| `dist/Mobility_Axiom_Deploy*` | Pack zip/stage |
| `docs/MOB-APPLIED-CN-*`, `docs/MOB-DISC-CN-*`, CN honesty discs | China paper |
| GB/`wvpRegisterMirror` / compose GB defaults **if** only for CN partner face | Revisit when CN reopens — **do not bundle into ANPR sidecar push** |

---

## Proposed lab push batches (details)

### BATCH A — `lab-git-push-anpr-sidecar` (**recommended first**)

**Why:** Live UI is on remote; **engine folder is not**. Biggest lab hole.

**Include:**
- `anpr-sidecar/` (code: `app.py`, `pipeline.py`, `vehicle_detect.py`, `requirements.txt`, `INSTALL.ps1`, `README.md`, …)
- `START-ANPR.bat`
- `scripts/anpr-smoke-harden.py` (if lab smoke)
- Remaining ANPR APPLIED not in `7fa58b3`:  
  `MOB-APPLIED-ANPR-LIVE-8-RAIL-COMPACT-V1-…`, `…-CROP-FIRST-…`, `…-POWER-CROP-…`, `…-VEHICLE-SCENE-…`, `…-VIDEO-ATTACH-…`
- Matching ANPR MOB-DISC papers you want saved (list at APPLY time)

**Exclude from A:**
- `anpr-sidecar/.venv/`, `__pycache__/`, huge `.onnx` if gitignored / too big — follow `.gitignore`; if models must ship, say so at APPLY
- `eng.traineddata` unless you explicitly want that binary in git

**Commit message (draft):**  
`lab-anpr-sidecar-genre: FastALPR/vehicle crop sidecar + START-ANPR checkpoint`

---

### BATCH B — `lab-git-push-license-lab`

**Why:** Trial wildcard + entitlements live in **lab code** (not the CN zip). Needed so desk matches remote.

**Include:**
- `lib/licenseManager.js` (trial_wildcard)
- `lib/licenseFeatures.js`, `lib/licenseEntitlementsMw.js`
- `public/js/license-features.js`, `public/js/license-entitlements-ui.js`
- Related license APPLIED/DISC if any (non-CN)

**Exclude:** `master_license.json`, CN pack docs

**Draft message:**  
`lab-license-genre: trial_wildcard verify + entitlements checkpoint`

---

### BATCH C — `lab-git-push-server-wvp-lab`

**Why:** Core server / WVP lab changes since 27 Jul still dirty.

**Include (review at APPLY — drop any pure-CN-only hunks):**
- `server.js`, `bin/me8-server.js`, `run.js`
- `lib/setupOnlyServer.js`, `lib/timeAnchor.js`, `lib/liveViewers.js`
- `lib/listenRetry.js`, `lib/sipBridge.js`, `lib/glassFortressLog.js` (if lab)
- `docker/wvp/docker-compose.wvp.yml`, `application-modern.yml` **only if** lab needs them (GB env defaults may be dual-use — flag at APPLY)
- `lib/wvpRegisterMirror.js` — **flag:** may be CN GB work; confirm before include
- `scripts/START-WVP-LAB.ps1`, `scripts/wvp-sip-lan-proxy.js`, `RESTART-FLEET.bat`, `restart-fleet-prefer-service.ps1`
- `package.json`, `package-lock.json`, `.env.example` (no secrets)

**Draft message:**  
`lab-server-wvp-genre: server/setup/WVP lab checkpoint`

---

### BATCH D — `lab-git-push-fr-evidence-cw-ui`

**Why:** FR / evidence / command wall / live HTML / caret / locales still local.

**Include:**
- `public/js/fr-alarm.js`, `evidence-manager.js`, `live-player-factory.js`, `i18n.js`, `ax-select-wrap.js`
- `public/command-wall.html`, `command-centre.html`, `live.html`, `matrix.html`, auth HTML pages listed dirty
- `public/css/settings-theme-unify.css`, `public/locales/en.json`
- Matching UI/FR/CW MOB discs you want

**Draft message:**  
`lab-fr-evidence-cw-ui-genre: checkpoint since 27 Jul`

---

### BATCH E — `lab-git-push-cad-routes`

**Include:**
- `public/js/cad-hub.js`
- `routes/` (CAD integration)
- CAD-related docs if any

---

### BATCH F — `lab-git-push-docs-paper`

**Include:** remaining `docs/MOB-DISC-*` / `MOB-APPLIED-*` **except** CN-* and pack-honesty CN discs  
**Exclude:** `Mobility Axiom Manuals V1/` unless you name manuals push separately  
**Exclude:** `baseline/**/.cursor/`

---

## What we are **not** committing in “lab first”

- China pack scripts / Setup bats / partner license file / dist zip  
- Baseline cursor snapshots  
- Customer manuals folder (unless separate APPLY)  
- Secrets / `.env` (never)

---

## Recommended order (one APPLY at a time)

1. **A** anpr-sidecar  
2. **B** license-lab  
3. **C** server-wvp-lab (with GB file confirm)  
4. **D** fr-evidence-cw-ui  
5. **E** cad  
6. **F** docs paper  

You pick: `MOB-APPLY lab-git-push-anpr-sidecar` (or another letter).

---

## Lock

- Details of **what** to push = this disc.  
- **Nothing** is committed until a named `lab-git-push-*` APPLY.  
- China pack stays **out**.
