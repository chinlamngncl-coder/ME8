# MOB DISC — Manuals V1 genre: queue and next MOB

**Date:** 2026-07-28  
**Status:** Installation Guide **PASS 2026-07-28** (v1.1 professional)  
**Done:** Installation PASS · Technical Manual PASS · Writing standards LOCKED · User + Quick Start v1.1 APPLIED (`MANUALS-V1-USER-QUICKSTART-UI-SYNC-V1`) — awaiting operator PASS/FAIL  
**See:** `MOB-DISC-MANUALS-V1-WRITING-STANDARDS-LOCKED.md` · `MOB-DISC-MANUALS-V1-STANDARDS-COUNTERCHECK.md`  
**Next when ordered:** After User/Quick Start PASS — park ANPR/weapon manuals until analytics software PASS (`MOB-DISC-MANUALS-V1-ANALYTICS-ANPR-WEAPON-PARK.md`). Then Managed Cloud / Hybrid, or Analytics sync MOB.  
**Search:** manuals next, Installation Guide, 6-phase Server Config, Mobility Axiom Manuals V1  
**Parent:** `Mobility Axiom Manuals V1/` (Word-first; not `docs/`)

---

## Done (PASS — do not redo)

| MOB | Result |
|-----|--------|
| **`MANUALS-V1-INSTALLATION-GUIDE-V1`** | **FAIL on positioning 2026-07-28** — bat/trial draft; rewrite = `MANUALS-V1-INSTALLATION-GUIDE-ENTERPRISE-REWRITE-V1` (see `MOB-DISC-MANUALS-V1-INSTALLATION-GUIDE-ENTERPRISE-FAIL.md`) |
| EN User Manual draft | `User/EN/User Manual.rtf` + `.md` backup |
| EN Quick Start draft | `Quick Start/EN/Quick Start Guide.rtf` |
| EN Technical Manual draft | `Tech/EN/Technical Manual.rtf` |
| **`MANUALS-V1-FIRST-LOGIN-PASSWORD-GATE-V1`** | PASS 2026-07-28 — IMPORTANT first sign-in in User / Quick Start / Tech + format §6.1 |

**Disc:** `MOB-DISC-MANUALS-V1-FIRST-LOGIN-PASSWORD-GATE.md`

---

## What EN manuals still lack (plain English)

| Gap | Why it matters |
|-----|----------------|
| **No Installation Guide** | ~~Format standard names it; file does not exist yet.~~ **DONE** — `Installation/EN/Installation Guide.rtf` |
| **Server Config = old shape** | Live UI is **6 phases** (Identity, Networking, Access & Security, Storage & Devices, Resiliency, Diagnostics). Tech manual still says vague “open network section” / “BWCs section” — wrong for screenshots and handoff. |
| **1-Pack boot path thin** | `bin/me8-server.js`, Setup on **13988**, deployment tier, `-Use1Pack` service — mostly in `docs/IT-ADMIN-MANUAL.md`, not in Manuals V1 Tech/Installation. |
| **No Migration Guide** | Format standard names it; not started. Ship-time doc for upgrades / site moves. |
| **Screenshots** | Placeholders only — correct to wait until wording PASS. |
| **Locales** | PH, KR, TH, ID, CN folders — after EN master PASS. |

**Not blocking manuals genre:** Pin/video MOBs, PTT, Packaging Robot — separate tracks (`MOB-DISC-CONSOLIDATE-PRE-SHIP-INVENTORY-20260727.md`).

---

## Manuals genre queue (recommended order)

| # | MOB name | What | Operator test |
|---|----------|------|----------------|
| **1** | **`MANUALS-V1-INSTALLATION-GUIDE-V1`** | **Next.** New `Installation Guide.rtf` (EN): unpack, prerequisites, one-time installer, start script, license, Setup Mode pointer, first sign-in cross-ref, first technical smoke. | IT reads guide on clean folder; steps match pack bats + first boot. |
| 2 | `MANUALS-V1-TECH-SERVER-CONFIG-6PHASE-SYNC-V1` | Rewrite Tech §8–11 (network, BWC, users, evidence) to **6-phase** tab names and paths. | Open Settings → Server Config; every step matches a visible phase. |
| 3 | `MANUALS-V1-TECH-1PACK-SETUP-SYNC-V1` | Fold `IT-ADMIN-MANUAL.md` essentials into Tech §Setup / Glass Fortress; add `-Use1Pack`, tier save, PIN-from-log. | Boot without license → Setup + PIN; WAN tier save. |
| 4 | `MANUALS-V1-EN-UI-WORDING-REVIEW-V1` | Pass User + Quick Start against live nav tabs (CAD padlock, Analytics, Tactical, etc.). | You read RTF in Word; no screenshot required. |
| 5 | `MANUALS-V1-SCREENSHOT-INSERT-PASS-V1` | Staff inserts U/Q/T placeholders; export PDF. | Visual match lab. |
| 6 | `MANUALS-V1-MIGRATION-GUIDE-V1` | Ship genre — upgrades, password policy, license move. | When you say ship/migration scope. |
| 7 | Locale packs | Copy EN master → `User/PH`, `User/KR`, … after EN PASS. | Per language. |

---

## Next MOB (one recommendation)

### `MANUALS-V1-INSTALLATION-GUIDE-V1`

**Why this one first**

1. **Missing manual type** — Format standard already lists Installation Guide; only User / Quick Start / Tech exist today.
2. **Natural follow-on** from first-login PASS — Installation Guide owns “what the customer receives and how to get running,” then points to Quick Start + forced password change.
3. **Does not fight live video** — No device or pin test; desk-only with pack files and browser.
4. **6-phase Tech sync is cleaner second** — Installation Guide can say “open Server Config” generically; Tech MOB #2 then details all six phases.

**Scope (APPLY target)**

Create:

`Mobility Axiom Manuals V1/Installation/EN/Installation Guide.rtf`

Sections (draft outline):

1. Purpose and audience (customer IT / installer)
2. What is in the delivery pack (folder, Install bat, Start bat, README, license slot, manuals, APK if VC)
3. Prerequisites (Windows 64-bit, LAN, admin rights, Docker if VC)
4. Installation steps (extract → run installer once → wait → start server)
5. First reachability (dashboard URL on host; note Setup-only vs full app)
6. License (where to put `license.lic`; Setup upload if gated)
7. **IMPORTANT — First sign-in** (cross-reference User/Quick Start; one-time `global` / `global123`)
8. First smoke checklist (dashboard opens after password change, Settings reachable)
9. Handoff (operator uses Quick Start; deep config = Technical Manual)
10. Common problems (port in use, no license, wrong IP — pointer to Tech Glass Fortress)
11. Screenshot placeholders (I-01 … I-08)
12. Document control

**Out of scope for this MOB**

- Rewriting entire Technical Manual
- 6-phase Server Config detail (MOB #2)
- Translations
- PDF export
- Product code changes

**Operator PASS test**

1. Open Installation Guide in Word.
2. Follow it on a lab pack path without guessing extra steps.
3. Confirm first boot, license, and first-login flow match what you see.
4. Say PASS or list line numbers that lie.

---

## Agent must NOT

- Jump to screenshot PDF export before Installation + 6-phase Tech wording PASS.
- Put canonical manuals back under `docs/` only.
- Bundle Installation Guide + 6-phase Tech + 1-Pack into one MOB.
- Remove first-login IMPORTANT blocks (locked MOB).

---

## Record

| Item | Value |
|------|--------|
| User said | “ok next. Mob disc” after first-login PASS |
| Genre | Mobility Axiom Manuals V1 |
| Next APPLY | `MANUALS-V1-INSTALLATION-GUIDE-V1` |
| Related | `MOB-DISC-CONSOLIDATE-PRE-SHIP-INVENTORY-20260727.md`, `MOB-DISC-MANUALS-V1-FIRST-LOGIN-PASSWORD-GATE.md`, `docs/IT-ADMIN-MANUAL.md` |
