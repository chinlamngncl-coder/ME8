# MOB-DISC — Consolidate pre-ship inventory V1

**Date:** 2026-07-27  
**Status:** LOCKED inventory — **not ready to ship**  
**MOB:** `CONSOLIDATE-PRE-SHIP-INVENTORY-V1`  
**Audience:** Operator (designer) — plain English; no rush to launch

---

## One sentence

You have **two products-in-progress**: the **normal lab app** (Fleet + video + map) and a **new secure installer/boot layer** — plus **translations and manuals** that have not caught up.

---

## Track 1 — Mature Fleet / WVP lab (what you use today)

**What it is:** The main Mobility Axiom app — map, video wall, SOS, PTT, Evidence, Settings, WVP live video.

**What works:** A lot. SEC phase 1, tactical, licensing (3.1–3.4), many FLV/handoff MOBs PASS, dashboard auth + 6-phase Settings (Jul 27).

**What is still open (do not ship until settled):**

| Area | Plain English |
|------|----------------|
| **Pin / map video** | Click pin → video / layout still unreliable; harm list says pin MOBs failed or partial |
| **PTT / voice** | Group call, field-to-field, 29201 paths — not finished |
| **Wall lifecycle** | Some stop/signal/lost chrome on FLV wall — phase 1 PASS but pin side partial |

**Locked rule:** WVP stays ON. Do not turn off handoff to “fix” lab.

**Doc:** `MOB-DISC-WVP-HARM-100-CONSOLIDATION-FIX-PLAN-20260720.md`

---

## Track 2 — New 1-Pack secure boot (Jul 27, mostly on disk only)

**What it is:** A new front door: `bin/me8-server.js` → license check → network tier → Setup UI or full app.

**What landed (code exists, many files uncommitted):**

| Step | What | Operator PASS? |
|------|------|----------------|
| 0 | Boot lock, firewall helper, Setup on 13988 | Yes (lab) |
| 2 | Deployment tier in Setup UI | Yes (WAN save) |
| 2.3 | WAN option + save button lock | Yes |
| 3 | Tier firewall + LAN software lock | Code only |
| 4 | License gatekeeper + 10KB limit | Code + agent smoke |
| 5 | Service `-Use1Pack`, log rotation | Code only |
| 6.1 | Time anchor (clock rollback) | Code + agent smoke; manual clock test skipped |

**What is NOT done for customers yet:**

- Default Windows service still runs **`server.js`**, not 1-Pack, unless IT installs with **`-Use1Pack`**
- **`pkg` / me8-server.exe** ship build not proven end-to-end
- Setup page **`setup-boot.html`** is English only
- Linux: unit file only — no install script
- Large git change set **not committed / not pushed** as a genre

**Lab entry:** `LAB-1PACK-SAFE-MODE.bat` → Setup only (`--safe-mode` skips license/clock gate).

---

## Translations (~900 keys behind English)

**What it means:** If an operator switches UI to Chinese/Korean/etc., **hundreds of labels still show English** or fall back.

**Recent example:** All **`server.phase.*`** strings (Identity, Networking, …) exist in **`en.json` only** — missing in zh, ko, th, id, fil.

**Setup boot** tier screen: not in locale files at all (hardcoded HTML).

**Before ship:** Named i18n MOB(s) — not “translate everything in one day,” but **ship surfaces** (Settings, Setup, login, nav).

---

## Manuals (operator PDFs / ship pack docs)

**What exists:** Trial-ship user + config manuals (en + some locales) under `scripts/trial-ship/manuals-*`.

**What they do NOT describe yet:**

- 1-Pack install / `me8-server` / Setup at port 13988
- Deployment tier (LAN / WAN / Cloud / Hybrid)
- 6-phase Server Config (old docs may still say 12 tabs or old flow)
- New dashboard auth / dispatch group chips
- `-Use1Pack` Windows service install

**Before ship:** Manuals genre — update then PASS with you reading one PDF.

---

## Security & pack gates (only when you say ship)

Already PASS in code/docs: SEC Google Five, air-gap license, entitlements, `build:ship` protected bundle.

**Parked until pack:** GitHub Packaging Robot live smoke, FM_TOTP off, full PRE-SHIP-GATE checklist.

**Doc:** `MOB-DISC-SHIP-PACK-GATHER-REMINDER-20260725.md`

---

## Git / commit state

Many Jul 26–27 MOBs are **APPLIED on disk** but **not committed** as a genre push. Lab rule: batch push when a **genre PASS** and you say `lab-git-push-<genre>`.

---

## Recommended finish order (no rush)

1. **1-Pack genre** — IT smoke `-Use1Pack`, lock APPLIED docs for 5 + 6.1, commit genre  
2. **Pin/video genre** — one harm-list MOB → your PASS  
3. **i18n genre** — server phases + setup-boot minimum  
4. **Manuals genre** — match 6-phase + 1-Pack  
5. **PTT/voice genre** — separate  
6. **Ship** — only when you say pack; AI prints gather checklist  

---

## Explicit non-blockers

- SOS ledger scope: PASS — do not re-test  
- Packaging Robot CI: parked OK  
- Phase 4 OTA: paused  
- Manual clock test 6.1: optional (code smoke OK)  

---

## Ship verdict

**NOT READY** until tracks 1–2 are consciously closed or accepted for a named customer scope, plus i18n/manuals minimum for that ship.
