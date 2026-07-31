# MOB DISC — What C and D files actually are (simple English)

**Date:** 2026-07-31  
**Status:** DISC only — no commit, no push, no code  
**Operator:** *Main server + WVP ~19 files / Other screens ~14 files — what the fuck are these actually?*

---

## How to read this

These are **files on your PC that changed since the 27 Jul git tip** and are **not pushed yet**.  
Pushing C or D only **saves them to GitHub** so you do not lose them. It does **not** start China pack.

---

## Bag C — “Main server + WVP / video start” (what each thing is)

**In one sentence:** The **engine room** — how Axiom starts, Setup, video stack helpers, restart buttons.

| File (name) | Plain English |
|-------------|----------------|
| `server.js` | Main Axiom brain when the dashboard is fully running |
| `run.js` | Ship/protected entry that starts the product |
| `bin/me8-server.js` | 1-Pack / boot front door (license gate → Setup or full server) |
| `lib/setupOnlyServer.js` | **Setup Mode** pages/API when there is no valid license yet |
| `lib/timeAnchor.js` | Clock / time safety used with license / boot |
| `lib/liveViewers.js` | Who is watching live video (viewer counts / tracking) |
| `lib/listenRetry.js` | If a network port fails to open, retry cleanly |
| `lib/sipBridge.js` | Small SIP helper bridge used by lab/video path |
| `lib/glassFortressLog.js` | Logging helper for Glass Fortress / secure boot story |
| `lib/wvpRegisterMirror.js` | Helps cameras register to WVP (IDs / mirror) — **flag at push:** some edits were for GB defaults |
| `docker/wvp/docker-compose.wvp.yml` | Recipe to start WVP video containers |
| `docker/wvp/wvp-config/application-modern.yml` | WVP settings file inside that stack |
| `scripts/START-WVP-LAB.ps1` | **Your double-click / script** to start WVP in lab |
| `scripts/wvp-sip-lan-proxy.js` | SIP LAN proxy helper for WVP lab |
| `RESTART-FLEET.bat` | Restart Axiom bat you already use |
| `restart-fleet-prefer-service.ps1` | Smarter restart script (prefer Windows service if present) |
| `package.json` + `package-lock.json` | List of Node libraries the server needs |
| `.env.example` | **Example** settings template (not your real secret `.env`) |

**~19 items** = that list. Not “19 mystery MOBs” — mostly **start / server / WVP recipe** files.

**APPLY later:** `MOB-APPLY lab-git-push-server-wvp-lab`

---

## Bag D — “Other screens (FR, Evidence, Command Wall, UI)” (what each thing is)

**In one sentence:** The **faces you click** — not the ANPR Live 4×4 (that is already pushed).

### Product screens / behaviour

| File | Plain English |
|------|----------------|
| `public/js/fr-alarm.js` | Face Recognition **alarm / hit** behaviour on the UI |
| `public/js/evidence-manager.js` | **Evidence** screen logic (files, cases, etc.) |
| `public/js/live-player-factory.js` | Shared helper that builds **live video players** (FLV etc.) |
| `public/command-wall.html` | **Command Wall** page shell |
| `public/command-centre.html` | **Centre Summary / command centre** page shell |
| `public/live.html` | Standalone / live viewing page |
| `public/matrix.html` | Video **matrix** page |
| `public/locales/en.json` | **English** UI text strings |
| `public/js/i18n.js` | Language switcher helper |
| `public/css/settings-theme-unify.css` | Settings / dark theme look polish |
| `public/js/ax-select-wrap.js` | Dropdown / caret UI helper (so selects look right) |

### Login / first-run / small pages (also dirty — same bag)

| File | Plain English |
|------|----------------|
| `public/setup-boot.html` | First Setup boot page |
| `public/must-change-password.html` | Force change password page |
| `public/enroll-totp.html` | Authenticator (TOTP) enroll page |
| `public/recovery-email.html` / `verify-recovery-email.html` | Recovery email pages |
| `public/legal-notices.html` | Legal notices page |

### Lab test pages (usually small; still in the dirty list)

| File | Plain English |
|------|----------------|
| `public/test-zlm.html`, `test-wvp-tile.html`, `test-seeta.html` | Internal **test** pages for video / face — not customer main nav |

**Count note:** Earlier “~14” was the **core** product/UI set. If we include auth + test HTML, the dirty D set is closer to **~20**. Still a **short** list, not a second product.

**APPLY later:** `MOB-APPLY lab-git-push-fr-evidence-cw-ui`

---

## What C and D are **not**

| Not this | Why |
|----------|-----|
| ANPR Live 4×4 / sidecar / license checker | **Already pushed** (A/B + Live) |
| China partner zip | **Parked** |
| “We invented 33 new secret features” | These are **changed lab files** waiting for a git save |

---

## One picture

```text
Bag C = engine room (start server, WVP, restart)
Bag D = other rooms in the house (FR, Evidence, Command Wall, login pages, UI polish)
```

You already saved: **ANPR room** + **license lock box**.  
C and D = save the **rest of the house** that changed since 27 Jul.

---

## Lock

- Simple English file meanings for C and D.  
- No push until you name `lab-git-push-server-wvp-lab` or `lab-git-push-fr-evidence-cw-ui`.
