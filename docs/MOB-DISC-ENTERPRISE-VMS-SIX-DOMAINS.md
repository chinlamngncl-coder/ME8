# MOB DISC — Enterprise VMS requirements (six domains + risk order)

**Status:** DISC only — no MOB-APPLY until you name the wave.  
**Source:** `BWC_PostQual_Reference_v3.docx` — Section 4 + Part 3 POC (software only; BWC hardware out of scope).  
**Tender:** ~1 week — brochure Part 1 + Part 3 POC rehearsal.  
**Search:** `enterprise VMS`, `six domains`, `redact`, `facial`, `open platform`

---

## Checkpoint record (deferred)

| MOB | Date | Checkpoint |
|-----|------|------------|
| `mob-me8-sos-ledger-dispatch-scope` | 2026-07-08 | **PASS** — scoped operator sees group-only ledger/CSV; out-of-scope folder open → 403. (Re-tested; deferred 2026-07-06 SKIP closed.) |

---

## Why `mob-me8-sos-ledger-dispatch-scope` does not harm live functions

Read-only filter on **API responses** — same `sessionCanSeeCam` rule already used for live SOS socket, map, and fleet roster.

| Area | Touched? | Harm risk |
|------|----------|-----------|
| `recordAlarm` / SIP SOS ingest | No | None |
| `sos-alarm` socket emit | No | None |
| SOS acknowledge / PTT team | No | None |
| Super-admin / legacy see-all operators | No change — `dispatchScope.scopeForUser` → `seeAll: true` | None |
| Ledger list / CSV / evidence SOS picker | Yes — filtered | Intended; operators lose visibility of **other stations’** incidents only |

Optional `canSeeCam` on `getDashboard` / `exportCsv` — when omitted (internal tools), behaviour is unchanged.

---

## Six domains — what the tender requires (software only)

Each domain needs: **rule** (system enforces), **behaviour** (operator sees), **SOP** (customer IT runs it), **MOB genre** (what we build or document).

| Domain | Tender refs | MOB genre |
|--------|-------------|-----------|
| **A — VMS product & deployment** | S4-1, S1-VMS, S1-Live, POC-3 | `mob-vms-deploy-hierarchy` |
| **B — Identity, access, audit** | S4-3, S4-4, S4-6 | `mob-auth-audit-ship` |
| **C — Evidence, encryption, metadata, redaction** | S4-2, S4-5, S4-7, S4-8, S4-9 | `mob-evidence-crypto-metadata` + **`mob-evidence-redact-simple-flow-with-draft-note`** (in-app) |
| **D — Live operations** | S4-11, S4-12, S1-SOS, S1-PTT, POC-1/2/4/5 | `mob-live-sos-ptt-poc` |
| **E — Facial detection & recognition** | S4-10, POC-6 | `mob-facial-detect-recognize` |
| **F — Open platform & integration** | S1-Open, S1-CC, S3-8, S5-1 | `mob-open-api-pack` |

---

## Risk factor (function + stability)

Scale **1 = safe** (docs / UI-only / no live path) → **5 = high** (historically breaks VC · PTT · SOS · wall).

| Step | Domain / MOB | Risk | What can break | Mitigation |
|------|----------------|------|----------------|------------|
| **1** | **F** `mob-open-api-pack` | **1** | Nothing runtime | PDF + affidavit; parallel to code |
| **2** | **C′** `mob-evidence-redact-simple-flow-with-draft-note` | **2** | Evidence only — **in-app**, no external tool | See `MOB-DISC-EVIDENCE-REDACT-IN-APP.md` |
| **3** | **A** `mob-vms-deploy-hierarchy` | **2** | Login URL if TLS misconfigured | Proxy in front; keep `:3988` internal; doc Operator URL |
| **4** | **C** `mob-evidence-crypto-metadata` (remainder) | **3** | Evidence catalog if AES policy wrong | Brochure + optional volume encryption; secrets vault already AES-256-GCM |
| **5** | **B** `mob-auth-audit-ship` | **3** | Admin lockout if TOTP/recovery wrong | Bench with `FM_TOTP_SUSPENDED=1`; recovery-email genre done |
| **6** | **D** `mob-live-sos-ptt-poc` | **5** | Wall, pins, PTT, SOS | One MOB at a time; checkpoint ritual; ledger scope **done** |
| **7** | **E** `mob-facial-detect-recognize` | **5** | New module + POC-6 demo | Last — partner/SDK boundary; no wall changes in v1 |

**Rule:** Steps **6–7 last**. Do not stack live/FR MOBs in one turn.

**Parked (operator owns later — not agent work until asked):** brochure / Part 1 desk, POC rehearsal script, open-API affidavit pack, perpetual/ISO/origin docs. Agent focuses on **runtime software** gaps only.

---

## Domain detail (match-oriented)

### A — VMS product & deployment

| Rule | Behaviour | SOP |
|------|-----------|-----|
| Browser VMS; no client install for dispatch | HTTPS URL → Operations wall + map + Evidence | Install kit: server + reverse proxy TLS |
| Perpetual license — no time-bomb on core VMS | License file bundled with ship | `PERPETUAL-LICENSE-STATEMENT.md` |
| NHQ sees all; station/TOC sees assigned scope | Super-admin = NHQ; operators by **dispatch group** | User matrix in brochure |

**MOB work:** Operator URL in Server Config, TLS checklist, hierarchy RBAC brochure table, multi-monitor command wall SOP.

---

### B — Identity, access, audit

| Rule | Behaviour | SOP |
|------|-----------|-----|
| No anonymous dashboard | Login + session timeout + TOTP at ship | Recovery email genre (applied) |
| Least privilege | Permission grid per role | RBAC matrix → tender “admin levels” |
| Privileged actions logged | Audit trail + CSV export | Retention policy 1–3 years |

**MOB work:** TOTP on for production, audit query/export brochure parity, RBAC matrix doc, **`mob-me8-sos-ledger-governance`** (clear/archive/audit — see `MOB-DISC-SOS-LEDGER-GOVERNANCE.md`).

---

### C — Evidence, encryption, metadata, redaction

| Rule | Behaviour | SOP |
|------|-----------|-----|
| AES-256 at rest | Secrets vault + secure export; IT may use encrypted volume | Key custody SOP |
| TLS in transit | HTTPS production | Agency CA / Let’s Encrypt |
| Metadata + search | Device, officer, time, GPS, source, notes | Schema table for brochure |
| User tags on files | Tag field + catalog filter | Training SOP |
| Redaction without destroying original | Redacted **copy** in Evidence Hub; original sealed | In-app redact + draft note + audit |

**Already in product (theme/UI):** Evidence Hub detail panel — `btn-ghost` / `ev-detail-grid`, trim export, secure export queue, **Redact video** button (`evidenceHub.openRedact`), prior exports list.

**Gap:** Redact button today shows help `alert` only — does not run the workflow you built before.

---

### D — Live operations

| Rule | Behaviour | SOP |
|------|-----------|-----|
| Registered BWCs livestream (perpetual) | 8-live cap; wall + pin + SOS invite | Load SOP |
| Real-time GPS on map | Group colours; SOS/Fall distinct | Map tiles note in brochure |
| SOS → dispatch + talk-group | Banner, auto-live, ledger, ack, response PTT | Dispatch group = visibility (**ledger scoped — applied**) |
| POC cellular + Wi‑Fi + VMS viewer | Same stream at command center | Demo network plan |

**MOB work:** POC rehearsal checklist, brochure language for hierarchy + talk-group; **avoid** new wall/pool MOBs unless checkpoint PASS.

---

### E — Facial detection & recognition

| Rule | Behaviour | SOP |
|------|-----------|-----|
| Detect + recognize workflow | Results linked to evidence/incident | Agency watchlist policy |
| Perpetual FR license | No subscription in bundle | License line in brochure |

**MOB work:** **Analytics Hub** — separate licensed tab; grey when not purchased. See `MOB-DISC-ANALYTICS-LICENSE-HUB.md`. Engine MOBs **last** (risk 5).

---

### F — Open platform & integration

| Rule | Behaviour | SOP |
|------|-----------|-----|
| API on request | REST/SIP/GPS/evidence/audit guide | `API-INTEGRATION-PACK` |
| No vendor lock-in (f1–f6) | MP4, CSV, SIP, standard exports | Signed undertaking + examples |
| Command center integration | Map, live, SOS, PTT via API | NHQ ↔ station diagram |

**MOB work:** API catalog + sample integrator doc — **no runtime change**.

---

## Evidence redaction — in-app only (decision locked)

**No external tool, no extra install.** Full spec: [`MOB-DISC-EVIDENCE-REDACT-IN-APP.md`](./MOB-DISC-EVIDENCE-REDACT-IN-APP.md).

Flow: Evidence Hub → Redact (embedded workspace) → Save redacted copy → Officer draft note → Super-admin finalize → Export/Register. Server uses bundled ffmpeg (same as trim export).

---

## Part 3 POC script (after steps 1–5; steps 6–7 live in rehearsal)

1. Login super-admin (TOTP) → Operations  
2. GPS map — units moving (POC-4)  
3. Livestream cellular → wall (POC-1)  
4. Livestream Wi‑Fi → second slot (POC-2)  
5. SOS → banner → auto-live → talk-group ack → PTT (S1-SOS, POC-5)  
6. Station operator — **scoped** ledger + fleet only  
7. Evidence → search metadata → tag → **redact import** (S4-9)  
8. Facial demo (POC-6) — after step 7 MOB  
9. Audit export CSV (S4-6)  
10. API pack handout (S1-Open)

---

## Enterprise rules (ship)

1. Production TLS — tender demo story uses HTTPS Operator URL.  
2. Perpetual — license doc matches TOR wording.  
3. Scope isolation — station never sees other stations’ SOS / live / evidence unless NHQ assigns.  
4. Audit before delete / export / redact import.  
5. API affidavit pack ready before Part 1 submission.

---

## Next MOB-APPLY (software only — brochure/POC parked)

**Updated 2026-07-08** — Evidence C slice largely applied (tags, crypto chip, pages, cold archive).

| Priority | MOB / slice | Status | Note |
|----------|-------------|--------|------|
| — | in-app redact + draft note | **Done** | C′ |
| — | crypto-metadata A (tags + chip) | **Done** | |
| — | catalog pagination | **Done** | |
| — | cold archive off active list | **Done** | not forever-delete |
| **1** | `mob-vms-deploy-hierarchy` | **In progress** | A1–A3 done. Next: A4 site readiness (`MOB-DISC-VMS-DEPLOY-HIERARCHY.md`) |
| **2** | `mob-auth-audit-ship` | Pending | TOTP on for ship; ship flags off bench; SOS ledger re-test |
| **3** | `mob-live-sos-ptt-poc` | Last | Live path — checkpoint ritual |
| **4** | `mob-facial-detect-recognize` | Last | Analytics / FR license — risk 5 |
| Parked | brochure · POC script · `mob-open-api-pack` | You | Outside software |

**Not a separate crypto “Next” anymore** unless you open slice B (redact/trim vs decrypt hole).

Reply: `MOB-APPLY mob-vms-deploy-a4-site-readiness` — A3 hierarchy labels done.
