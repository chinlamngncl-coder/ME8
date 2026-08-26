# MOB DISC — OPS-CASE-AND-LANGUAGE-SAFETY-CHECK-V1 (2026-08-27)

**Status:** PAPER ONLY — safety check + proposal. **No code. No APPLY execution.**  
**Rules:** `.cursorrules` · CREDIT-LEAN · zero-change-without-APPLY.  
**Parents:** `docs/MOB-DISC-MASTER-CODE-AUDIT-ALL-ORPHANS-V1-20260826.md` · `docs/GLOBAL-ENGLISH-STRINGS-AUDIT.md`

---

## Operator one-liner

1. **Dead Ops Case panel** can be retired without touching live SOS → **Case Files** — if we never remount `/api/ops-cases` and never delete Case Files paths.  
2. **Language audit** needs a **gated apply script** with hard casing / acronym / no-jargon rules — operator reviews rows first; script never freestyles.

---

# 1. OPS CASE — BLAST RADIUS AND SAFEST PATH

## 1.1 What is live vs dead (proven)

| Path | Status | Proof |
|------|--------|--------|
| SOS raise / Ack → Case File | **LIVE** | `server.js` → `caseFiles.ensureFromSos`; strip Open Case → `GET /api/case-files/by-sos/:id` → `CaseFilesUi.openCase` |
| Evidence → **Cases** tab | **LIVE** | `EvidenceHub.showPanel('case-files')`; `case-files-ui.js` + `/api/case-files/*` |
| Export Case Package ZIP | **LIVE** | `GET /api/case-files/:id/export` |
| `#ev-panel-ops-cases` + `ops-cases-ui.js` | **ORPHAN UI** | Nav `#ev-nav-ops-cases` forced `hidden`; hub aliases `ops-cases` → `case-files` |
| `/api/ops-cases/*` | **UNMOUNTED** | `ops-cases-ui.js` still fetches these URLs; **no** `require('./opsCaseStore')` / no route mount in live `server.js` |
| `lib/opsCaseStore.js` | **ORPHAN LIB** | JSON under `storage/ops-cases/` design; unused by live HTTP |
| `caseFiles.createFromOpsCase` | **ORPHAN HELPER** | Exported; intended for Continue-as-Case-File; no live mounted caller |

**Naming trap:** Ack JSON still returns a field named `opsCase` that is actually a **Case File** id. That is vocabulary debt only — not the JSON Ops Case store.

## 1.2 Exact blast radius if we remove / rewire the dead panel

### A) Safe to remove (does **not** break SOS Case Files)

| Artifact | Why safe |
|----------|----------|
| `#ev-nav-ops-cases` (already hidden) | Never shown; Cases uses `case-files` |
| `#ev-panel-ops-cases` HTML + related CSS | Panel never opened via hub alias |
| `public/js/ops-cases-ui.js` script tag | Only drives dead panel / dead API calls |
| Soft refs that only check `ev-panel-ops-cases` visibility (e.g. ftp-inbox map helper) | Dead if panel never shown; must **null-check or retarget** in same MOB if removed |

### B) Must **never** touch in an Ops-Case cleanup MOB

| Artifact | Why |
|----------|-----|
| `lib/caseFiles.js` `ensureFromSos` / Case File CRUD | Live SOS spine |
| `/api/case-files/*` including `by-sos`, `from-sos`, export | Live |
| `CaseFilesUi` / Evidence Cases panel | Live |
| SOS strip `openSosCaseFromStrip` | Live |
| `siteDb` case_files / `ops_case_id` column | Live link field on Case Files |
| Court package / evidence package verify | Unrelated live product |

### C) Conditional / decide first (not auto-delete)

| Artifact | Risk if deleted blindly |
|----------|-------------------------|
| `lib/opsCaseStore.js` + any `storage/ops-cases/` files on disk | **Data** may exist from older lab runs; deleting store without WAIVE loses historical JSON tickets (not Case Files). Prefer: leave files on disk; stop shipping UI. |
| `createFromOpsCase` | Only needed if product still wants “Continue as Case File” from a second ticket type. Today: dead. WAIVE or rewire onto Case Files desk later — **separate named MOB**. |
| i18n `opsCases.*` keys | Harmless leftovers; remove only in a copy cleanup MOB after UI gone. |

### D) Will removing the dead panel break live SOS Case Files?

**No** — provided the cleanup MOB:

1. Does **not** remount `/api/ops-cases`.  
2. Does **not** change `ensureFromSos` / `by-sos` / Cases panel.  
3. Does **not** remove `ops_case_id` from Case Files schema (field can stay even if Ops Case JSON is abandoned).  
4. Retargets any soft DOM checks that assumed `ev-panel-ops-cases` was a live desk.

Live SOS already ignores the orphan path.

## 1.3 Safest technical path (recommended order)

**Single recommendation:** **Retire UI only first** — do not remount the dead API.

| Step | Named MOB (future) | Action |
|-----:|---------------------|--------|
| 1 | Operator **WAIVE** or **PASS**: “Ops Case JSON desk abandoned; Case Files = Cases” | Lock product truth on paper |
| 2 | `OPS-CASE-UI-RETIRE-V1` | Hide/remove `#ev-panel-ops-cases`, nav stub, script include; fix soft refs; **leave** `opsCaseStore.js` and disk JSON untouched |
| 3 | Optional later `OPS-CASE-STORE-ARCHIVE-NOTE-V1` | Doc-only: how to archive old `storage/ops-cases` if any |
| 4 | Only if product still needs Continue | `CASE-FILE-CONTINUE-REWIRE-OR-WAIVE-V1` on **Case Files** desk — never via unmounted `/api/ops-cases` |

**Forbidden “fix”:** Remounting `/api/ops-cases` to make the orphan UI work again — dual desks, dual stores, higher blast radius.

---

# 2. LANGUAGE SCRIPT PROPOSAL — `GLOBAL-ENGLISH-STRINGS-AUDIT.md`

## 2.1 Goal

Process ~3000+ `en.json` rows (plus JS `tr()` fallback diffs) into **approved** enterprise copy — **not** a blind bulk title-case of every sentence.

## 2.2 How casing is guaranteed (strict rules)

Script applies **deterministic transforms** only after operator marks rows APPROVED. Rules locked:

| Kind | Rule | Example |
|------|------|---------|
| Nav / tab / field **label** / short button (≤ ~8 words, no sentence end) | **Title Case** each principal word | `Overview Camera` |
| Joiners in chrome | Stay lower: and, or, of, the, a, an, to, for, in, on, at, by, from, with, as | `Route and GPS` |
| Acronyms (shout) | Forced ALL CAPS (or product form) | **PIN**, **POI**, **SIM**, **AR**, **BWC**, **SOS**, **GPS**, **FTP**, **ANPR**, **PTT**, **LAN**, **URL**, **ID**, **SHA-256**, **IPv4** |
| Toast / error / empty **sentences** | **Sentence case** (first capital only) unless APPROVED row says Title Case | `No redacted files found.` |
| Placeholders `{name}` | Never title-case inside braces | `{page}` stays `{page}` |

**Guarantee mechanism:**

1. Classification by **key pattern** (`nav.`, `*.Title`, `*.Label`, `evidenceHub.nav*`, etc.) → chrome vs sentence.  
2. Acronym dictionary (explicit list; operator can extend before run).  
3. Post-pass validator fails APPLY if chrome string contains `\bPoi\b`, `\bPin\b` (map pin chrome), `\bSim\b` as product SIM, or `&`.  
4. **No** global “title-case every value” — that corrupted placeholders in an earlier experiment; banned.

## 2.3 How raw code / Ph / IdLabel / jargon are removed

| Detect | Action |
|--------|--------|
| Value looks like key debris (`Package Verify Id Ph`, `*Label`, `*Title` as visible text) | Replace with human chrome from APPROVED Proposed column only |
| `Ph` / `Placeholder` as visible word | Strip; rewrite as real placeholder e.g. `Enter Package ID` |
| Developer jargon (endpoint, payload, hashOnly, mount, WIP, TODO in UI) | Flag **BLOCK** — never auto-fix; operator must supply text |
| `&` / `&amp;` in chrome | Force `and` |
| Empty teach strips already `""` | Keep empty (Bucket A) |

Script **never invents** Proposed text at APPLY time. It only writes:

- Operator-edited Proposed cell, or  
- Mechanically safe transforms of **APPROVED** rows that already pass the rules above.

## 2.4 Parsing plan (operator approval before any script write)

**Phase P0 — Inventory (already done):**  
`docs/GLOBAL-ENGLISH-STRINGS-AUDIT.md` = Key | Current | Proposed.

**Phase P1 — Operator triage (you):**  
Mark each row (or batch by prefix):

| Mark | Meaning |
|------|---------|
| `KEEP` | Current stays; ignore Proposed |
| `APPLY` | Use Proposed (or your edit of Proposed) |
| `REWRITE` | You paste final text in Proposed |
| `SKIP-SENTENCE` | Do not title-case; leave as body copy |

Practical batch: approve by **prefix** (`evidenceHub.nav*`, `server.tab.*`, `nav.*`) first — highest chrome risk.

**Phase P2 — Script design (shown for approval; not run until APPLY):**

1. Input: audit MD table + optional CSV of marks.  
2. Output dry-run: `docs/GLOBAL-ENGLISH-STRINGS-APPLY-DRYRUN.md` — only rows that will change.  
3. Operator PASS dry-run.  
4. `MOB-APPLY GLOBAL-ENGLISH-STRINGS-APPLY-V1` writes `en.json` (+ matching HTML `data-i18n` fallbacks for touched keys only) + foreign locales **only** where English chrome keys are still English leftovers or amp/Poi bugs — never overwrite good translations blindly.  
5. Validator report: acronyms, `&`, `{Placeholder}` corruption, keys missing.

**Phase P3 — Forbidden without new APPLY:**  
Bulk-edit all 3361 Proposed heuristics from the extract (many are wrong for sentences).

## 2.5 Risk summary (language)

| Risk | Mitigation |
|------|------------|
| Title-casing error toasts | Chrome-key classifier + SKIP-SENTENCE |
| Breaking i18n `{vars}` | Brace protect + validator |
| Fighting operator UX copy already PASS | KEEP marks |
| Foreign locale wipe | EN first; foreign surgical only |

---

## Explicit non-goals of this disc

- No product code.  
- No remount of `/api/ops-cases`.  
- No bulk language APPLY.  
- No inventing a second Cases product.

---

## Operator next steps (pick one)

1. **WAIVE** Ops Case JSON desk → then later `MOB-APPLY OPS-CASE-UI-RETIRE-V1`  
2. Start language: mark audit batches `KEEP` / `APPLY` → then dry-run APPLY name when ready  
3. Ask questions on any blast-radius row above before any APPLY  
