# 09 — Lane A locked scope (Google alignment)

**Date:** 2026-06-27  
**Status:** Locked — execute in order below.

---

## Lane A — immediate urgent ship

| # | Item | Doc / MOB |
|---|------|-----------|
| 1 | VERIFY + smoke | [LANE-A-SHIP-CHECKLIST.md](../LANE-A-SHIP-CHECKLIST.md) |
| 2 | OSM attribution MOB | `MOB-APPLY mob-compliance-osm-attribution` |
| 3 | THIRD-PARTY-NOTICES | [THIRD-PARTY-NOTICES.md](../../THIRD-PARTY-NOTICES.md) |
| 4 | Ship pack | App + manual + restore + notices |

### Google (record here)

```text
That is a pragmatic, airtight release plan. By separating the urgent commercial and compliance blockers from the heavier architectural shifts, you protect your release velocity without carrying unacceptable legal or operational risk into the wild.

Lane A (Immediate Urgent Ship):
- VERIFY + Smoke Tests
- OSM Attribution MOB
- THIRD-PARTY-NOTICES
- Ship Pack

Deferred to Post-Lane A:
- FFmpeg Decoupling
- Database Infrastructure (Postgres + queue)
- Valkey Swap
- Offline Maps
```

---

## Strike order (Mobility)

| First | Why |
|-------|-----|
| **1. VERIFY + smoke** | Proves v1.9 works **before** any change |
| **2. THIRD-PARTY-NOTICES** | Doc only — can run **same day** as step 1 (draft done) |
| **3. Attribution MOB** | One small CSS fix — after baseline confirmed |
| **4. Re-smoke A1–A2** | Map credit visible; pins still work |
| **5. Ship pack** | Zip / handoff |

**Do not** start FFmpeg, Postgres, Valkey, or offline maps in Lane A.

---

### Google — smoke test method (record here)

```text
Lane A critical path: Auth/socket → SIP REGISTER/GPS → FFmpeg live/stop → SOS (+ optional FTP snapshot).
Mobility: No automated E2E suite for SIP/live/SOS. VERIFY + verify-install + storage smoke are automated; critical path is manual against physical lab BWCs. SOS detail: SOS-TEST-PLAN-V1.md.
```

### Google — gating strategy confirmed (record here)

```text
Highly pragmatic for v1 hardware-integrated release. Automated E2E for SIP/RTP is flaky; human eyes on physical devices for critical path is safest. VERIFY + storage smoke for deterministic parts; manual lab checklist for BWC/SOS/FFmpeg; SIPp/scale deferred post-ship staging. Clear executable path to Lane A gate.
```

**Checklist status:** Formalized — [LANE-A-SHIP-CHECKLIST.md](../LANE-A-SHIP-CHECKLIST.md) (C1–C14). Ready to execute.

---

## Reply to Google

> No full automated suite for Lane A critical path. We run VERIFY-TRIAL-GOLD (automated), npm verify + storage smoke (automated), then manual checklist C1–C14 on physical lab BWCs per LANE-A-SHIP-CHECKLIST.md. SIPp/scale scripts are staging-only, not ship gate.

---

*MOB DISC*
