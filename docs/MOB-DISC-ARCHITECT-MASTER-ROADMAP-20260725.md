# MOB DISC — System Architect Master Roadmap (VMS upgrades)

**Date:** 2026-07-25  
**Status:** **LOCKED MEMORY** — strict mob programming  
**Source:** System Architect master roadmap (operator paste)

---

## Strict execution rule

- **One task at a time**  
- Wait for operator **review / PASS** before the next task  
- **Do not** jump ahead, combine tasks, or start paused phases early  

---

## Phase 1 — Critical Security Hotfixes (“SEC Google Five”)

**STATUS: Phase 1 SEC Google Five — COMPLETE**

| Task | APPLY name | Status |
|------|------------|--------|
| **1.1** | `SEC-BWC-COMPANION-TIMING-SAFE-HASH-V1` | **PASS** |
| **1.2** | `SEC-SOS-OPEN-EXPLORER-NO-CMD-V1` | **PASS** |
| **1.3** | `SEC-EVIDENCE-UPLOAD-FREE-DISK-V1` | **PASS** |
| **1.4** | `SEC-MSG-REASSEMBLER-TTL-V1` | **PASS** |
| **1.5** | `SEC-MSGWSS-HMAC-AUTH-V1` | **PASS** |

Phases **1 complete**. Phase **3 Task 3.1** in review; Phase **4** PAUSED.

Detail disc: `MOB-DISC-SEC-GOOGLE-FIVE-TIMING-SPAWN-DISK-WS-20260724.md`

---

## Phase 2 — Tactical T2 & PTZ AR

**STATUS: Phase 2 COMPLETE for roadmap purposes** (2.5 camera smoke still PARKED)

| Task | Scope | Status |
|------|--------|--------|
| **2.1** | Postgres `tactical_blueprints` / `tactical_pins` + UV | **PASS** |
| **2.2** | Blueprint upload 5 MB / UUID / MIME | **PASS** |
| **2.3** | Overwatch split + UV / Save View sync | **PASS** (FOV/compass live smoke **parked** — no PTZ) |
| **2.4** | Real ONVIF + Fixed Cameras CSV → PG | **PASS** (merged) |
| **2.5** | ONVIF harden + Pull-Point + Profile M prep | **PARKED** — code landed; operator smoke deferred (no cameras) |

**Words / UI:** operator chrome = **Overwatch (AR)** / **Close Overwatch** — `MOB-APPLIED-TACTICAL-OVERWATCH-AR-WORDS-V1-20260725.md`

---

## Phase 3 — Pre-shipping (Licensing & RBAC)

**STATUS: UNPAUSED — 3.1–3.4 landed; await PASS before wrapping Phase 3**

| Task | Scope | Status |
|------|--------|--------|
| **3.1** | Offline Ed25519 `license.lic` generator + boot validator + HWID | **PASS** (2026-07-25) |
| **3.2** | Code protection & production packaging (`build:ship` / minified `run.js`) | **PASS** (2026-07-25) |
| **3.3** | GitHub Packaging Robot + issue templates + `RELEASE_GUIDE` | **Code landed; Actions smoke PARKED until ship/pack** |
| **3.4** | Feature entitlements + capacity middleware + UI grey-out | **PASS** (2026-07-25) |

APPLIED 3.1: `MOB-APPLIED-AIRGAP-LICENSE-LIC-ED25519-V1-20260725.md`  
APPLIED 3.2: `MOB-APPLIED-CODE-PROTECTION-SHIP-PACKAGING-V1-20260725.md`  
APPLIED 3.3: `MOB-APPLIED-PACKAGING-ROBOT-ISSUE-TEMPLATES-V1-20260725.md`  
APPLIED 3.4: `MOB-APPLIED-LICENSE-ENTITLEMENTS-ENFORCE-V1-20260725.md`  
Guide: `docs/RELEASE_GUIDE.md`  
**Park disc:** `MOB-DISC-PACKAGING-ROBOT-SMOKE-PARK-UNTIL-SHIP-20260725.md`  
**Ship/pack gather (AI reminds you):** `MOB-DISC-SHIP-PACK-GATHER-REMINDER-20260725.md`

**Phase 3 product tasks 3.1–3.4:** operator PASS on 3.4. Packaging Robot live smoke still parked until ship/pack. Do not auto-wrap until you say Phase 3 complete.

**Follow-on (not Phase 3 wrap):** Tactical pin drag black — fixed `TACTICAL-PIN-DRAG-NO-POPUP-UPDATE-WIPE-V1` — re-smoke. Rename “Grab circle” — options disc, await pick.

---

## Phase 4 — Post-sales diagnostics & OTA

**STATUS: PAUSED**

| Task | Scope |
|------|--------|
| 4.1 | Encrypted diagnostic bundles (no passwords) |
| 4.2 | Signed OTA + 5‑min health rollback |

---

## Pointer

Current execute cursor: **Phase 3 Task 3.4 — waiting for your review**. Do **not** wrap Phase 3 until you PASS.  
On **ship/pack**: AI prints pack gather (license + source protect + robot smoke + pre-ship).  
Pack story: `MOB-DISC-PACK-CONTROL-PER-CLIENT-20260725.md`  
License test/ship story: `MOB-DISC-LICENSE-SHIP-TEST-AND-GREYOUT-STORY-20260725.md`
