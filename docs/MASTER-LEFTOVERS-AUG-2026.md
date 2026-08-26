# MASTER LEFTOVERS — August 2026

**Created:** 2026-08-26  
**MOB:** `MASTER-REPO-MOB-RECONCILIATION-V1`  
**Purpose:** Reconcile ~4 months of ME8 MOB history so recent Epics A/B/C do not erase older arcs.  
**Sources crawled:** `docs/` MOB-DISC / MOB-APPLIED / MASTER / VMS / wake-up / open-arcs / architect roadmap / manuals-closure audit. No separate `DISC/` directory exists in repo.  
**Rules:** One named `MOB-APPLY` at a time. No daily ship/SOS/TOTP nag. WVP handoff stays on (no park). SOS ledger scope = PASS (do not re-nag).

**Agent owns this ledger.** Operator does not track it.

---

## How to read

| Bucket | Meaning |
|--------|---------|
| **A** | Code often landed; **needs live video / BWC / dock / PTZ / Colab GPU** before PASS. Park prove until hardware month. |
| **B** | Intentionally **PARKED until ship/pack** or post-sales phase. Do not start in daily lab. |
| **C** | Started / APPLIED / disc-open but **never officially closed** (orphan PASS or half genre). |

Items may appear once only (primary bucket). Cross-refs point to source discs.

---

## Snapshot — where we are (2026-08-26)

| Arc | State |
|-----|--------|
| Architect Phase 1 SEC Google Five | **COMPLETE / PASS** |
| Architect Phase 2 Tactical T2 / Overwatch words | **COMPLETE** (2.5 camera smoke parked) |
| Architect Phase 3 License / pack / entitlements | **Code landed**; Packaging Robot smoke → **Bucket B**; wrap Phase 3 only when you say |
| Architect Phase 4 Diagnostics / OTA | **PAUSED** → Bucket B |
| Epics A SOS→Investigation, B PTZ embeds, C1+C2 Overwatch engine | **In tree**; site PASS deferred (no cams) → Bucket A |
| Soft PTT group / HQ alert tones / SOS ledger last frame | Treated **PASS** unless reopened |
| Manuals / language closure | Disc only 2026-08-26 → Bucket C until named APPLY |

Primary older inventories (do not delete):  
`MOB-DISC-WAKE-UP-FINALISE-LEFTOVERS-20260811.md` · `MOB-DISC-WHAT-IS-LEFT-CONSOLIDATED-20260809.md` · `MOB-DISC-OPEN-ARCS-DO-NOT-DROP-20260809.md` · `MOB-DISC-ARCHITECT-MASTER-ROADMAP-20260725.md` · `MOB-DISC-SIMPLE-FINISH-LADDER-AFTER-ANPR-TO-PACK-20260811.md` · `MOB-DISC-MANUAL-AND-LANGUAGE-CLOSURE-AUDIT-V1-20260826.md` · `MOB-DISC-VMS-OVERWATCH-AR-ENGINE-C1-NOTE-20260826.md`

---

## A. PENDING OPERATOR PASS (live video / hardware — park prove until next month)

### A1 — Overwatch / Fixed / VMS (Aug 2026 + Phase 2.5)

| Item | Notes / disc |
|------|----------------|
| `VMS-OVERWATCH-AR-ENGINE-C1-V1` | 1 Focus + 8 PIP mount engine — **code in**; need distinct fixed cams |
| `VMS-OVERWATCH-AR-PROMOTE-C2-V1` | Promote / FIFO eviction — **code in**; PASS-later accepted |
| Phase **2.5** ONVIF harden / Pull-Point / Profile M smoke | Architect roadmap — **PARKED smoke** (no cameras) |
| VMS discovery Phases 1–5 (profiles, playback, smart record, imaging, Profile M AI) | `MOB-VMS-BASELINE-DISCOVERY.md` — product roadmap; much not started as named MOB |
| Investigation / Command Shell / SOS→Investigation | Epic A code in tree — site prove with SOS + cams |

### A2 — WVP / FLV live ladder (do not drop; do not park handoff)

Locked order (`me8-wvp-finish-no-park` / harm consolidation):

| Phase | MOB | Notes |
|-------|-----|--------|
| 1 | `FLV-WALL-LIFECYCLE-PARITY-V1` | Stop / signal lost / stall on Ops wall |
| 2 | `COMMAND-WALL-FLV-HANDOFF-V1` | Often prior PASS — re-smoke if FAIL |
| 3 | `FR-LIVE-WATCH-FLV-HANDOFF-V1` | Same |
| 4 | `PIN-FLV-MIRROR-HARDEN-V1` | Firmware Gold pin mirror — no freestyle |
| 5 | `PIN-FOCUSED-OPEN-V1` | Layout / auto-pin storm |
| 6+ | Wall audio / `PTT-29201-WVP-HOMED-V1` / panel polish | **After** video surfaces PASS |

Also still showing “await PASS / operator test pending” in APPLIED docs (prove when live lab returns):

- Pin wall baseline / pin baseline open / pin-link graft / popout close safe  
- Map pin colocated outward dock V2  
- Command Wall fill/cover  
- Axiom unified FLV engine; many ANPR live rail/crop/viewport APPLIED docs  
- Tactical pin cluster / fullview / draggable / prepare-operate / grab cycle (eyes PASS)  
- VC layout / lobby / APK meeting layout family  
- PTT group mesh talk (some historical PASS — re-open only on FAIL)  
- `VALKEY-FLEET-RUNTIME-STATE-DEGRADE-V1` operator smoke  
- LAN audio / HTTPS mic (`DASHBOARD-TLS-SAN-LAN-IP-V1` — mic PASS pending)  
- Video popout minimap APPLY disc  

**ZLM latency → ~2s wall:** **PARKED** (operator rule) — not in A as active work; see Bucket B.

### A3 — SOS / dock / cases prove (hardware)

| Item | Notes |
|------|--------|
| SOS dual media lab PASS | Code ✅; dock delayed historically |
| Dock / FTP matchback Part 2 | Needs docking station |
| `OPS-CASE-DUAL-RECORD-AUTO-DOCK-MUST-V1` | When dock on desk |
| SOS Record Part 1 re-smoke | BWC firmware OEM flaky possible |
| Case continue / library picker / retention / delete queue | APPLIED — PASS pending (some UI-only; listed here if tied to case+media stories) |

### A4 — Analytics engines (GPU / Colab + live prove)

| Item | Notes |
|------|--------|
| Weapon Track B Colab → `WEAPON-B-NEGATIVES-RELOAD-V1` | Wake-up Pri 1 |
| ANPR Colab plan → train → weights reload | Keep FastALPR live path; after Weapon |
| ANPR plate YOLO / night / lists / engine health | Many APPLIED await field PASS |
| Weapon SOP leftovers (FP / hit report / snap faster / ack-all) | Optional when named |

### A5 — Live-dependent tactical map

| Item | Notes |
|------|--------|
| Tactical Leaflet draw / delete list / user circle batch open / map AR POI | APPLIED — PASS/FAIL pending |
| Tactical pin drag black re-smoke | Fix claimed; await re-smoke |
| Open grabbed pin popup live | Await eyes |

---

## B. PARKED FOR SHIP (or post-sales / explicit park)

| Item | Why parked | Disc / note |
|------|------------|-------------|
| **Packaging Robot GitHub Actions smoke** | Until pack/ship | `MOB-DISC-PACKAGING-ROBOT-SMOKE-PARK-UNTIL-SHIP-20260725.md` |
| **Pack gather / pre-ship gate / TOTP off** | Only when user says ship/pack | `MOB-DISC-SHIP-PACK-GATHER-REMINDER` · `me8-pre-ship-gate` |
| **Architect Phase 4** encrypted diagnostic bundles + signed OTA rollback | Roadmap **PAUSED** | `MOB-DISC-ARCHITECT-MASTER-ROADMAP-20260725.md` |
| **Admin unlock / super-admin recovery build** | PARKED until `admin unlock build` | `MOB-DISC-ADMIN-UNLOCK-PLAIN.md` |
| **ZLM Option B latency chase (~2s)** | Explicit park | User rule + ZLM disc PARKED section |
| **ANPR / Weapon dedicated manuals** | Until analytics software PASS | `MOB-DISC-MANUALS-V1-ANALYTICS-ANPR-WEAPON-PARK.md` |
| **ANPR Live hit→map FR parity** | Design parked | `MOB-DISC-ANPR-LIVE-HIT-MAP-FR-PARITY-PARKED-20260731.md` |
| **Weapon Colab BOTH train** | GPU quota | `MOB-DISC-WEAPON-COLAB-GPU-PARK-DO-OPS-NOW-20260808.md` |
| **SEC Google Five timing spawn** follow-ons | Priority recorded; parked behind tactical handoff historically | `MOB-DISC-SEC-GOOGLE-FIVE-TIMING-SPAWN-DISK-WS-20260724.md` |
| **Roadmap commit PTT alert parked** | Do not APPLY until named | `MOB-DISC-ROADMAP-COMMIT-NOT-DONE-PTT-ALERT-PARKED-20260723.md` |
| **BWC serial registry “immediate APPLY”** | Was parked pending menu confirm — serial later applied; any **remaining** OEM serial hygiene stays ship-time | `MOB-DISC-BWC-IDENTITY-SHIP-HINT-SERIAL-VS-GB-20260809.md` |
| **Test2 update-not-virus clarity** | Ship messaging | `MOB-DISC-TEST2-UPDATE-NOT-VIRUS.md` |
| **FR map restore-view / pin color / mini-map** | Soft parked in FR discs | FR map discs Jul 13 |
| **FR snapshot threshold default** | Still pending default | `MOB-DISC-FR-SNAPSHOT-RAIL-THRESHOLD.md` |
| **Docking station encryption** | **Not found** as a named MOB in `docs/` crawl — if product still wants it, open a new DISC; do not invent from memory |

---

## C. ORPHANED / UNCLOSED TASKS (started, never officially closed)

### C1 — APPLIED UI/copy with PASS never recorded (can close without live video)

Batch PASS/WAIVE recommended via future `DOCS-WAIVE-OR-PASS-NO-VIDEO-APPLIED-V1` (see manuals-closure audit):

- Redact / Prior exports family (empty hint, row compact, trim, finalize, password confirm, scroll compact, span label, superadmin actions)  
- `UI-DARK-FORM-CONTROLS-UNIFY-V1`  
- Analytics grade filter chevron  
- Select caret overlay  
- UI-COPY professional / panel intro / title-only / Holds+Retention copy APPLYs (PASS pending hard refresh)  
- Settings theme unify / visual overhaul / master settings grid V4 (visual PASS pending)  
- Restart health print HTTPS 4438 (console wording)  
- Packaging Robot **issue templates** review (not Actions smoke)  
- Installation guide enterprise rewrite — operator review pending  
- `CASE-FILE-CONTINUE-FROM-OPS-CASE-V1` / ops-case bind picker / evidence retention / delete queue / redact license grey — if not waived  
- License entitlements enforce — “await review / do not wrap Phase 3 yet”  

### C2 — Disc / genre orphans (open APPLYs or unfinished paper)

| Item | Notes |
|------|--------|
| Manuals + language closure | `MOB-DISC-MANUAL-AND-LANGUAGE-CLOSURE-AUDIT-V1-20260826.md` — EN User/Config/Quick gaps; license banner jargon; i18n keys |
| `CASES-SUPERADMIN-REPORT-CSV-V1` | Named, not closed |
| `SOS-OPS-ROW-TO-CASE-V1` | Named, not closed |
| Call group dispatch | Historical leftover; soft PTT later marked done — confirm Call Groups UI still wanted or WAIVE |
| `CONFERENCE-BWC-INGRESS-WVP-HANDOFF-V1` | Harm B10 — not closed |
| HQ per-action tones V2 / session mute | Optional orphans |
| VMS Incident Correlation / Evidence Vault naming | Appears in discovery & later work; no single closed “Vault genre” PASS — treat unfinished VMS phases as open product debt under A1 + this orphan note |
| Phase 3 wrap | 3.1–3.4 landed; official “Phase 3 COMPLETE” never declared |
| Simple finish ladder Steps 2–9 after ANPR | `MOB-DISC-SIMPLE-FINISH-LADDER-AFTER-ANPR-TO-PACK-20260811.md` — may be stale vs Aug VMS; reconcile before following blindly |

### C3 — Do-not-pretend-open (closed — listed so agent does not resurrect)

SOS ledger scope · Soft PTT group · HQ alert tones code · Brand Axiom · Firmware Gold pin mirror rules · DeviceControl `udp_once` · Zero-change-without-APPLY · Credit-lean / no-nag ship reminders.

---

## Recommended resume order (when operator returns — agent picks one)

1. **No cams month:** Bucket **C1** PASS/WAIVE day + Manuals EN APPLY (from language-closure audit).  
2. **Weapon/ANPR Colab ready:** Bucket **A4** Weapon reload then ANPR plan.  
3. **Cams back:** Bucket **A1** Overwatch C1/C2 site smoke → then WVP ladder **A2** only on FAIL.  
4. **Ship month:** Bucket **B** pack gather + Packaging Robot smoke + manuals locales.  
5. **Never auto-start:** Phase 4 OTA, admin unlock, ZLM latency, invent dock encryption.

---

## Crawl limits (honest)

- Thousands of `MOB-*.md` files; status lines are noisy (duplicate APPLIED paths, stale “await PASS” after later PASS).  
- This ledger **consolidates** wake-up / open-arcs / architect / VMS discovery / Aug Overwatch / manuals audit — it is not a line-by-line reprint of every Jul 20 pin doc.  
- When in doubt: prefer **newer** consolidated disc over a July APPLIED “pending” line.

**Next agent action when asked “what’s left”:** open **this file** first, then the primary older inventories listed at top.
