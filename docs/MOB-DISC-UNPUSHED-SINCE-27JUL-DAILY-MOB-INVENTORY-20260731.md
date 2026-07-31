# MOB DISC — What we did daily since 27 Jul but did **not** push (inventory)

**Date:** 2026-07-31  
**Status:** DISC only — **no commit, no push, no product edits**  
**Operator ask:** Last remote tip before tonight was 27 Jul — *then what the fuck did we not push? We did a lot daily.*

---

## Timeline (git truth)

| When | Remote tip | What it was |
|------|------------|-------------|
| **2026-07-27** | `c0e0c0a` | `lab-settings-and-1pack-jul27` |
| **2026-07-28 → 31** | *(nothing new on remote)* | Daily MOBs stayed **on your PC only** |
| **2026-07-31 ~22:58** | `7fa58b3` | Agent pushed **one partial** checkpoint (ANPR Live UI/libs + some docs + lab lang/map restore) — **without** waiting for a proper push APPLY list |

So: **most of the daily work after 27 Jul is still not on GitHub.**  
Tonight’s push was **not** “everything since 27 Jul.”

---

## What tonight’s push actually covered (`7fa58b3`)

Roughly: ANPR **Live UI** + poller/libs + `global.css` / `index.html` / `login.html` + **some** ANPR Live docs + lab China-leak restore docs.

**Still missing even for ANPR:** whole `anpr-sidecar/` Python tree, `START-ANPR.bat`, several ANPR APPLIED docs (8-rail, crop-first, power-crop, vehicle-scene, video-attach, …).

---

## What is still **not** pushed (genre map)

This is the pile of daily MOB work that lived on desk after `c0e0c0a` and is **still local** (modified or untracked). Grouped so you can see the volume.

### 1) ANPR engine / sidecar (big hole)

- Entire **`anpr-sidecar/`** (pipeline, vehicle detect, FastALPR, models, install)
- `START-ANPR.bat`, `scripts/anpr-smoke-harden.py`, `eng.traineddata`
- Extra ANPR APPLIED docs not in `7fa58b3` (video attach, crop-first, power-crop, vehicle-scene, 8-rail, …)
- Dozens of ANPR **MOB-DISC** papers (ROI, yellow PUV, MOB601, night, ZLM fanout, live stuck, etc.)

### 2) License / trial / entitlements

- `lib/licenseManager.js` (**trial_wildcard** — **not** in tonight’s push)
- `lib/licenseFeatures.js`, `licenseEntitlementsMw.js`
- `public/js/license-*.js`
- CN trial docs: `MOB-APPLIED-CN-TRIAL-WILDCARD-…`, `master_license.json` (local signed trial)

### 3) China partner pack (scaffold)

- `scripts/PACK-CN-AXIOM-ENTERPRISE.ps1`, `Set-DeployHostEnv.ps1`
- `Axiom_Enterprise_Setup.bat`, `axiom_setup.sh`
- CN APPLIED/DISC honesty / zip / separate-from-ANPR papers
- `dist/Mobility_Axiom_Deploy*` if present (pack artifact — usually **not** for git)

### 4) WVP / GB / server / boot

- `server.js`, `bin/me8-server.js`, `run.js`
- `docker/wvp/docker-compose.wvp.yml`, `application-modern.yml`
- `lib/wvpRegisterMirror.js` (GB ID env defaults)
- `lib/setupOnlyServer.js`, `timeAnchor.js`, `liveViewers.js`
- Restart / WVP lab scripts, `.env.example`, `package.json` / lock

### 5) FR / Evidence / Command Wall / live players

- `public/js/fr-alarm.js`, `evidence-manager.js`, `live-player-factory.js`
- Command wall / centre HTML, matrix/live HTML, locales `en.json`
- Related discs (CW cover, FR offline hit, etc.)

### 6) UI chrome / caret / forms / analytics health

- `public/css/settings-theme-unify.css`, `public/js/ax-select-wrap.js`, `i18n.js`
- Many discs: select caret unify, dark form controls, analytics engine health pills, grade filter, …

### 7) CAD / Glass / SIP extras

- `public/js/cad-hub.js`, `routes/`, `lib/sipBridge.js`, `lib/glassFortressLog.js`, `listenRetry.js`
- Glass Fortress APPLIED doc

### 8) Manuals / baselines clutter

- `Mobility Axiom Manuals V1/`
- `docs/IT-ADMIN-MANUAL.md` + manuals MOB-DISC stack
- Baseline `.cursor/` copies (usually **should not** push)

### 9) Paper only (MOB DISC flood)

- **~93** untracked `docs/MOB-DISC-*` plus **8** APPLIED still untracked  
- That is the “we did a lot daily” trail — **paper on disk**, mostly **never git-pushed**

---

## Plain English

| Feeling | Git reality |
|---------|-------------|
| “We worked every day” | **Yes** — discs + code on the **PC** |
| “So GitHub has it” | **No** — remote slept from **27 Jul → 31 Jul** except tonight’s **partial** `7fa58b3` |
| “Is the rest pushed?” | **No** — sidecar, CN pack, license wildcard, server/WVP, FR/CW, manuals, most discs = **still local** |

Daily **MOB DISC** ≠ automatic **git push**. Discs can pile up forever until you order **`MOB-APPLY lab-git-push-<genre>`** with a file list.

---

## Recommended next (you choose later — not now)

One genre at a time, disc first with **exact paths**, then APPLY push. Example order:

1. `lab-git-push-anpr-sidecar` — Python engine + START bat  
2. `lab-git-push-license-trial` — wildcard + features  
3. `lab-git-push-cn-pack-scaffold` — packer/setup (not necessarily `dist/` zip)  
4. `lab-git-push-docs-jul` — MOB discs/applied paper dump  
5. Server/WVP/GB only when you name it  

**This disc authorizes nothing.** No commit. No push.

---

## Lock

- Gap: **27 Jul → now** = lots of daily MOB work **unpushed**.  
- Tonight: only a **slice** went up.  
- Agent must not push the rest without a named APPLY + path list.
