# MOB DISC — CN enterprise zip: what “done” really means (83 MB honesty)

**Date:** 2026-07-31  
**Status:** DISC — paper only (no code in this disc)  
**Trigger:** Operator ask after pack: *is it done? Docker + software only ~83 MB? Sure? Chinese?*  
**Related:** `MOB-APPLIED-CN-AXIOM-ENTERPRISE-PACK-20260731.md`, `MOB-APPLIED-CN-TRIAL-WILDCARD-LICENSE-PACK-20260731.md`, `MOB-DISC-CN-PARTNER-DEPLOY-PACK-RECON-20260731.md`, `MOB-DISC-COMMERCIAL-PACK-NEW-NO-PORT-RELIGION-20260731.md`

---

## Plain English answer

**Partly done. Not a full air-gap China appliance.**

| Claim | Truth |
|-------|--------|
| Zip exists? | **Yes** — `dist/Mobility_Axiom_Deploy.zip` (~83 MB) |
| Partner can unzip and double-click Setup? | **Script yes** — `Axiom_Enterprise_Setup.bat` writes `.env`, tries `docker compose`, starts `ship-build/protected/run.js` |
| “All Dockers + software inside the zip”? | **No** — zip has **compose YAML** (~0.3 MB), **not** Docker images |
| Trial license inside? | **Yes** — `storage/license.lic` with `hardwareId: trial_wildcard`, 20 BWC / 10 IPC, expiry **2027-08-29** |
| Ready for long-term production without HWID swap? | **No** — wildcard is a **365-day trial bridge**; replace with host-locked `.lic` when partner HWID is known |

The earlier line (“unzip → Setup → later replace license”) means: **the scaffolding zip + trial license path is built**. It does **not** mean: “everything China needs is already inside 83 MB.”

---

## Why ~83 MB is “sure” for *this* packer — and still too small for *full* ship

Unzipped stage (approx):

| Piece | Size | What it is |
|-------|------|------------|
| `vendor/ffmpeg-lgpl/ffmpeg.exe` | ~109 MB | Decode helper binary |
| `data/gis/offline` | ~34 MB | Some offline tiles (~2k files) — **not** a full national basemap |
| `ship-build/protected` + `public` | ~14 MB | Protected Axiom runtime blob + UI (incl. `zh.json`) |
| `docker/**` | ~0.3 MB | **Compose / config only** |
| `storage/license.lic` | &lt;1 KB | Signed trial |
| **Zip** | **~83 MB** | Compression of the above |

**Missing from this zip (expected gaps today):**

1. **Docker images** (Postgres / Valkey / WVP / ZLM / LiveKit, etc.) — partner machine **`docker compose up` pulls from registries**. That can be **several GB**. Not in the zip.  
2. **Node.js runtime** — Setup assumes `node` already on PATH. No bundled Node 22.  
3. **`node_modules`** — not copied; protected `run.js` still needs external npm packages next to it on a real ship story (this packer did **not** stage a full `npm ci` tree).  
4. **ANPR / FR Python sidecars** — **not** in the zip (`anpr-sidecar`, `fr-sidecar` absent). Analytics engines are **not** partner-ready from this archive alone.  
5. **Full offline China map** — ~34 MB of tiles is a **starter**, not “all of Jiangsu / CN offline forever.”  
6. **Pre-ship desk smoke** — zip was produced; **clean-machine smoke PASS** was not claimed.

So: **83 MB is honest for “app blob + ffmpeg + thin GIS + compose + trial license.”**  
It is **not** honest if someone expected “USB with Dockers + Node + AI already inside.”

---

## Is it Chinese?

| Item | In this zip? |
|------|----------------|
| UI default language **zh** (`fm-default-lang=zh`, locales `zh,en`) | **Yes** (staged HTML) |
| Map country **cn**, Jiangsu center **32.0617, 118.7630** | **Yes** (in product defaults / staged) |
| Offline-map **intent** for deploy | **Intended** (packer / comment); treat as **verify on partner screen** — do not assume OSM works offline |
| GB platform IDs no longer hardcoded Guangdong `440102…` in compose path | **Scaffold yes** (env-driven defaults) — partner still sets **their** GB IDs / HOST in Setup |
| Chinese README / install manuals | **Thin** English `README-DEPLOY.txt` only — **not** a full CN install guide pack |
| China air-gap (no Docker Hub pull) | **No** — current Setup **pulls** images if Docker is installed |

**Verdict:** Face leans **Chinese (zh + CN map)**. Delivery is **not** yet a sealed China offline product.

---

## What the trial wildcard line meant (restate)

1. Pack blocked without a signed license → we minted **`TRIAL_WILDCARD`** so Step 5 could finish.  
2. Verifier skips MAC match for that HWID **until expiry** (`2027-08-29`).  
3. Partner can boot Setup **without** sending HWID first.  
4. When they send HWID → Ubitron signs a **host-locked** `license.lic` → replace `storage/license.lic`.  
5. Do **not** leave wildcard on a permanent production box after go-live.

That is **license story done for trial**. Not “full product ship done.”

---

## Partner open-box reality (honest checklist)

Partner PC needs **outside the zip** (today):

- Windows (or Linux for `.sh`) + **Docker Desktop** (or equivalent) with registry access **or** preloaded images  
- **Node.js 22+** on PATH  
- Enough disk for image pulls (GBs)  
- Network for first compose pull (unless you later ship `docker save` tarballs)  
- Separate story for ANPR/FR if those modules are sold  

If partner has **no internet**, this zip **fails** as-is for video stack.

---

## Risk if we pretend 83 MB = enterprise complete

| Risk | Harm |
|------|------|
| Partner opens zip, thinks Dockers are inside | “Compose fails / no image” support storm |
| No Node bundled | Setup starts Axiom line fails |
| No node_modules staged | Runtime missing modules |
| No ANPR/FR | License shows AI on; engines absent |
| Thin GIS + offline meta | Blank or weak map |
| Wildcard forever | License control gone |

---

## Single recommended next path (when you order APPLY)

**Do not tell partner “full ship” yet.**

Next named MOB (pick when ready — one at a time):

1. **`CN-PARTNER-FAT-PACK-V1`** — stage real ship deps (`node_modules` or documented install), confirm Node story (bundle **or** clear Install prerequisite), optional `docker save` / image offline load script, ANPR/FR include-or-exclude explicit.  
2. Or **`CN-PARTNER-SMOKE-DESK-V1`** — clean VM: unzip → Setup → login → map zh → one live — PASS/FAIL before USB leaves.

Until then: call current artifact **“CN enterprise scaffold zip + 365d trial license”**, not **“complete China appliance.”**

---

## Lock

- **Zip = done for scaffold + trial license injection.**  
- **83 MB = expected for that scope; not full Dockers/AI.**  
- **Chinese face = mostly yes (zh/cn/Jiangsu); air-gap China = no.**  
- No code in this disc. No silent re-pack.
