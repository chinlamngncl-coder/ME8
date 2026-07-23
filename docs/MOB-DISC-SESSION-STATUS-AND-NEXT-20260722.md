# MOB DISC — Session status & what is next (2026-07-22)

**Status:** DISC only — **no APPLY**  
**Date:** 2026-07-22  
**Trigger:** Operator PASS on `CASE-FILES-LIST-TABLE-ONE-VIEW-V5`; ask: finished all MOBs? vulnerability? Valkey? migration?  
**Search:** `next MOB`, `WVP harm`, `Valkey`, `security`, `case files`, `migration`

---

## Short answer

**No — we have not finished everything.**  
**Yes — big chunks are done** (security deps, Valkey legal pin, most WVP FLV surfaces, Case Files list today).  
**Next** depends on genre — agent pick below is **one line**, not a buffet.

---

## A. Today PASS — Case Files list (closed)

| MOB | Status |
|-----|--------|
| `CASE-FILES-LIST-TABLE-ONE-VIEW-V5` | **PASS** (operator 2026-07-22) |
| Prior list MOBs (actions, scroll, back nav) | Applied — list path stable |

**Lesson locked:** small table CSS needs **one 100% budget** — not COL-FIT whack-a-mole.

---

## B. Case Files — still open (detail + product)

From `MOB-DISC-CASE-FILES-FOUR-GAPS-20260722.md`:

| # | Item | MOB | Status |
|---|------|-----|--------|
| 1 | Equal height / bottom border on detail panes | `BOX-CLOSE-V2` | Applied — **operator confirm PASS/FAIL** (list fixed; detail not re-tested today) |
| 2 | Linked evidence — what ID to paste? | `CASE-FILES-LINKED-EVIDENCE-HINT-V1` | **Not applied** |
| 3 | Form left-rail alignment | `FORM-ALIGN-V1` | Applied — confirm with detail |
| 4 | List Detail column | `ONE-VIEW-V5` | **PASS** |

**Optional later:** `CASE-FILES-LINK-RECENT-V1` — pick evidence from recent library (no tab hop). Disc exists; not built.

**Agent pick for Case Files genre:**  
1. Operator quick check detail panes after V5 refresh → if FAIL, one fix MOB only.  
2. Else **`MOB-APPLY CASE-FILES-LINKED-EVIDENCE-HINT-V1`** (officers need plain hint).

---

## C. WVP / live video — NOT finished (main product backlog)

Source: `MOB-DISC-WVP-HARM-100-CONSOLIDATION-FIX-PLAN-20260720.md`

### Done / PASS (phases 1–5b)

| Phase | MOB | Surface |
|-------|-----|---------|
| 1 | `FLV-WALL-LIFECYCLE-PARITY-V1` | Ops wall stop / signal / stall |
| 2 | `COMMAND-WALL-FLV-HANDOFF-V1` | Command Wall |
| 3 | `FR-LIVE-WATCH-FLV-HANDOFF-V1` | FR live tiles |
| 4–5b | Panel + matrix popout FLV + close-safe | Second monitors |

### Still broken or unproven (phases 6–13)

| Priority | MOB | What |
|----------|-----|------|
| **NEXT (video)** | `PIN-CLICK-POPUP-OPEN-NO-DOCK-STORM-V1` | Map pin click → popup live; no dock storm / layout jump (7e in harm plan) |
| 8 | `WALL-AUDIO-PATH-V1` | Wall listen — FLV has no audio today |
| 9 | `CONFERENCE-BWC-INGRESS-WVP-HANDOFF-V1` | Let BWC into VC room under handoff |
| 10 | `PTT-29201-WVP-HOMED-V1` | Soft PTT / Call when cam on `:5060` |
| 11 | `SOS-GROUP-FIELD-RX-RELAY-V1` | Field PTT mesh |
| 12 | `PTT-GROUP-SELECT-1PLUS-V1` | Dispatch Join UI |
| 13 | Panel 16:9 polish | `REAPPLY-PANEL-16x9-V1` |

**WVP/ZLM stays ON.** Do not turn off handoff to “fix” lab.

**Agent pick for live genre:** **`PIN-CLICK-POPUP-OPEN-NO-DOCK-STORM-V1`** when operator returns to map/pin work.

---

## D. Security & vulnerability — mostly done for Node; lab creds open

Source: `MOB-DISC-THIRD-PARTY-SECURITY-HARDENING-HANDOFF-20260722.md`

### Done (claimed + verify scripts)

| Area | MOB / work |
|------|------------|
| `npm audit` production | **0 vulns** — `SEC-PRODUCTION-DEPENDENCY-AUDIT-FIXES-V1` |
| SIP Call-ID crypto | `SEC-SIP-CRYPTO-RANDOM` + live modules v2 |
| Login rate limit | LRU |
| Fatal process policy | exit on uncaught |
| Ship `run.js` parity | verify script |

### Still open (not panic — named MOBs)

| # | MOB | Why |
|---|-----|-----|
| 1 | `LAB-DEFAULT-CREDS-AND-IMAGE-PIN-V1` | LiveKit `devkey`, WVP `admin123`, `ingress:latest` — **lab only today**; must fix before customer pack |
| 2 | `SEC-NONSIP-ID-CRYPTO-RANDOM-V1` | Optional — `Math.random` in fixed-cam IDs, conference share ids |
| 3 | Pack time only | `FM_TOTP_SUSPENDED` off for real ship |

**We are not “vulnerability clean” for a shipped VC/WVP stack until B1 creds MOB passes** — Fleet Node side is in good shape.

---

## E. Valkey — done for Fleet; not a migration blocker

Source: `MOB-DISC-VALKEY-PURPOSE-AND-LEGAL-TIMEBOMB-20260722.md`

| Question | Answer |
|----------|--------|
| What is Valkey? | Optional **runtime cache** (GPS / online / SIP contact) — **not** evidence backup |
| Legal | **BSD-3-Clause** — clean for OEM |
| Postgres | **PostgreSQL License** — clean |
| Redis time bomb | **Fixed in active compose** — `ENTERPRISE-REDIS-IMAGE-LEGAL-PIN-V1` (LiveKit + WVP → Valkey 8) |
| Must use Valkey? | **No** — unset `FM_REDIS_URL` = memory + JSON only |
| Migration | **No operator migration** — optional enterprise compose service |

**Valkey genre: closed** unless you want multi-node shared state later (separate disc).

---

## F. Other genres — not finished

| Genre | Status | Next (if you care) |
|-------|--------|---------------------|
| **Redact / Prior exports** | UX loops open | `REDACT-FINISH-LOOP-HANDOFF-V1` (security handoff pick #1) |
| **Investigation holds** | Disposition MOBs applied this week | Operator PASS on clear/discard cards |
| **FR / face** | Large separate queue | Say “FR” when ready — not mixed with Case Files |
| **Postgres catalog migration** | `db/migrations/001_catalog_primary.sql` in tree | Enterprise catalog path — **discuss before APPLY**; not operator-facing today |
| **Git push** | Batch by genre | Say `lab-git-push-<genre>` when a genre passes — not auto |

---

## G. Agent pick — one next MOB (risk order)

You just closed **Case Files list**. Do **not** jump to pin or PTT without your say.

| If you want… | Next MOB |
|--------------|----------|
| **Finish Case Files for officers** | `CASE-FILES-LINKED-EVIDENCE-HINT-V1` (+ confirm detail `BOX-CLOSE-V2`) |
| **Finish redact UX** | `REDACT-FINISH-LOOP-HANDOFF-V1` |
| **Return to live / map** | `PIN-CLICK-POPUP-OPEN-NO-DOCK-STORM-V1` |
| **Harden lab before any pack** | `LAB-DEFAULT-CREDS-AND-IMAGE-PIN-V1` |

**Default recommendation:** **`CASE-FILES-LINKED-EVIDENCE-HINT-V1`** — small, CSS+i18n, finishes the Case Files detail story officers actually use.

---

## H. What we will not do

- Turn off WVP handoff  
- Bundle Case Files + pin + security in one APPLY  
- Re-open COL-FIT V2–V4 (dead — superseded by V5)  
- Nag SOS ledger / TOTP outside ship pack  

---

## Ask

Reply with one:

- **`MOB-APPLY CASE-FILES-LINKED-EVIDENCE-HINT-V1`**
- **`MOB-APPLY PIN-CLICK-POPUP-OPEN-NO-DOCK-STORM-V1`**
- **`MOB-APPLY REDACT-FINISH-LOOP-HANDOFF-V1`**
- **`MOB-APPLY LAB-DEFAULT-CREDS-AND-IMAGE-PIN-V1`**

Or: “confirm detail panes” — operator opens a case, pass/fail on bottom border only.
