# PRE-RELEASE BUILD AUDIT — `dist/Mobility_Axiom_Deploy.zip`

**Date:** 2026-07-31  
**Role:** Lead Release Engineer audit  
**Scope:** Existing zip + staging only. **NO rebuild. NO fixes. Facts for operator review.**  
**Artifacts:**  
- Zip: `ME8/dist/Mobility_Axiom_Deploy.zip`  
- Stage: `ME8/dist/Mobility_Axiom_Deploy/` (unzipped twin used for inspection)

---

## VERDICT (one line)

**FAIL as a fat offline enterprise appliance.** Present zip is a **thin scaffold** (~83 MB). Missing offline Docker image tars, missing bundled Node 22 runtime, license not at zip root (under `storage/`), GIS has tiles but no `.mbtiles`.

---

## 1) ZIP / STAGE CONTENTS (tree)

### Zip meta
| Item | Value |
|------|--------|
| Path | `dist/Mobility_Axiom_Deploy.zip` |
| Last write | 2026-07-31 21:59:29 +0800 |
| Zip size | **83.33 MB** (0.081 GB) |
| Stage unzipped size | **~156.7 MB** |

### Top-level staging tree (actual)

```text
Mobility_Axiom_Deploy/
  Axiom_Enterprise_Setup.bat
  axiom_setup.sh
  README-DEPLOY.txt
  .env.deploy.example          ← no live .env in package
  package.json
  package-lock.json
  data/
    gis/offline/               ← layers/, tiles/, json presets
  docker/                      ← compose YAML + WVP config only (~0.3 MB)
  keys/                        ← EMPTY (no pem files found)
  public/                      ← UI assets
  scripts/                     ← Set-DeployHostEnv.ps1 etc.
  ship-build/
    protected/                 ← run.js + public (protected blob)
  storage/
    license.lic
    master_license.json        ← same trial content (~698 B each)
  vendor/
    ffmpeg-lgpl/ffmpeg.exe     ← ~108.8 MB
```

### Folder weight (stage)

| Folder | ~MB |
|--------|-----|
| vendor | 108.8 |
| data | 33.7 |
| ship-build | 7.3 |
| public | 6.4 |
| docker | 0.3 |
| keys / storage / scripts | ~0 |

**Absent top-level folders required by this audit brief:** `offline_images/`, `runtime/`

---

## 2) VERIFY SIZE

| Check | Result |
|-------|--------|
| Zip size | **83.33 MB** |
| Under 1 GB? | **YES** |
| Flag | **PROBABLE FAILURE / missing images** for an offline Docker+Node fat pack |

---

## 3) MANDATORY FILE CHECK

| Requirement | Result | Detail |
|-------------|--------|--------|
| `/offline_images/` with `.tar` for all services | **FAIL — ABSENT** | No `offline_images` dir. No `.tar` files anywhere under stage. Docker folder is compose/config only. |
| `/runtime/` with Node 22 binary | **FAIL — ABSENT** | No `runtime/` dir. No `node.exe` in package. |
| `/master_license.json` at **root** | **FAIL — not at root** | Exists as `storage/master_license.json` (+ `storage/license.lic`). **Not** zip-root `master_license.json`. |
| `/data/gis/offline/` map tiles or `.mbtiles` | **PARTIAL** | `tiles/` present: **1973 files ~33.7 MB**. **`.mbtiles` count = 0**. layers/ + json presets present. |
| `keys/license-private.pem` ABSENT | **PASS** | No `*private*.pem` under stage. `keys/` empty. |

### License content note (fact, not redesign)

`storage/license.lic` payload includes `"hardwareId": "trial_wildcard"`, expiry `2027-08-29`, 20 BWC / 10 IPC, premium features on.  
(Lane: matches a **trial** pack asset, not a host-locked commercial ship license.)

---

## 4) PORT COLLISION CHECK

| Fact | Detail |
|------|--------|
| Live `.env` in package? | **No** — only `.env.deploy.example` |
| Defaults in example | `FM_HTTP_PORT=3888`, WVP HTTP `18080`, ZLM HTTP `18088`, Fleet SIP `5062`, WVP SIP `5060`, PTT `29201`, MSG WS `6000` |
| Collision risk | **Cannot prove collision on a partner PC from this zip alone** (depends on their OS/services). |
| Notable | Dual SIP **5060 + 5062** and dashboard **3888** are the pack defaults; Setup writes `.env` from example + HOST IP. HTTPS off by default. |

---

## 5) LAUNCHER CHECK (`Axiom_Enterprise_Setup.bat`)

| Check | Result |
|-------|--------|
| References bundled Node under `/runtime/`? | **FAIL — does not** |
| Actual start line | `node ship-build\protected\run.js` (PATH `node` from the machine) |
| Fallbacks | `node run.js` / `node server.js` if protected missing |
| Docker | `docker compose ... up -d` (expects Docker installed + image **pull**, not local tars) |
| Dashboard URL printed | `http://!HOST_IP!:3888` |

**Conclusion:** Launcher assumes **system Node** and **online/registry Docker**, not offline `runtime/node` + `offline_images/*.tar`.

---

## SCORECARD (audit brief vs reality)

| # | Item | Pass/Fail |
|---|------|-----------|
| 1 | Tree documented | Done (above) |
| 2 | Size ≥ meaningful fat pack (~1GB+) | **FAIL** (83 MB) |
| 3a | offline_images tars | **FAIL** |
| 3b | runtime Node 22 | **FAIL** |
| 3c | master_license.json at root | **FAIL** (under storage only) |
| 3d | GIS offline tiles/mbtiles | **PARTIAL** (tiles yes, mbtiles no) |
| 3e | private key absent | **PASS** |
| 4 | .env port collision | **N/A / unproven** (no baked .env; example defaults listed) |
| 5 | bat → runtime Node | **FAIL** |

---

## STOP

Audit complete. **Waiting for operator review.**  
No rebuild, no packer re-run, no file edits from this audit.
