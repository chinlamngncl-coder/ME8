# MOB DISC — MASTER-CODE-AUDIT-ALL-ORPHANS-V1 (2026-08-26)

**Status:** PAPER ONLY — architectural audit. **No code written or applied under this MOB.**  
**Rules:** `.cursorrules` · CREDIT-LEAN · zero-change-without-APPLY · no invent beyond named targets.  
**Parent leftovers:** `docs/MASTER-LEFTOVERS-AUG-2026.md` §C.

---

## Operator one-liner

Several “Cases / SOS / Continue” surfaces still look finished in the UI, but the **Ops Case JSON API path is not mounted on the server**. Live SOS → Case wiring already prefers **Case Files (Postgres)**. CSV report, conference BWC under WVP, Settings/Redact visual PASS, and HQ per-action tones V2 remain open orphans.

---

## Architecture fact (shared by Case / SOS targets)

| Layer | Live product path today | Orphan / dual path |
|-------|-------------------------|--------------------|
| Alert tickets intended as “Ops Cases” | SOS raise/Ack → `lib/caseFiles.js` + `siteDb` (`case_files`, `ops_case_id`) | `lib/opsCaseStore.js` JSON under install `storage/ops-cases/` |
| Evidence nav “Cases” | `EvidenceHub.showPanel('case-files')` — **`ops-cases` is force-aliased to `case-files`** in `public/js/evidence-hub.js` | Hidden nav `#ev-nav-ops-cases` + full `#ev-panel-ops-cases` + `public/js/ops-cases-ui.js` |
| HTTP | `/api/case-files/*` registered in `server.js` | Frontend still calls `/api/ops-cases/*` from `ops-cases-ui.js` — **no `require` of `opsCaseStore` and no `/api/ops-cases` routes found in live `server.js` / `lib` mounts** |

**Proof of stop:** store file exists and is large; UI and buttons exist; API consumers exist; **store is never required**. That is the primary architectural break for anything still aimed at the Ops Case desk.

---

## 1. `CASES-SUPERADMIN-REPORT-CSV-V1`

### A. FETCH — tied files

| Role | Path |
|------|------|
| Design lock | `docs/MOB-DISC-SOS-OPS-STRIP-FOUR-ACTIONS-DESIGN-20260809.md` §5–§6 |
| Leftover flag | `docs/MASTER-LEFTOVERS-AUG-2026.md` C2 |
| Intended UI host | Evidence → Cases = Case Files panel (`public/index.html` case-files chrome, `public/js/case-files-ui.js`) |
| Related APIs (exist, wrong job) | `GET /api/case-files/:id/export` — **per Case File package**, not agency report CSV |
| Other CSV (not this MOB) | Audit trail, Centre summary, BWC list, SOS incident export elsewhere |
| Data | Case Files rows in site DB via `lib/caseFiles.js` / `lib/siteDb.js`; SOS fields via `sosIncidents` when linked |

### B. BUG HUNT — where work stopped

1. **No UI control** on Case Files list for “Export report CSV” (date range / sort / super-admin gate).  
2. **No server report endpoint** implementing §5 column set.  
3. Ops strip CSV was **explicitly forbidden** by design — do not resurrect strip download.  
4. If anyone expected Ops Case JSON export: that store is **unmounted** (see shared architecture).

### C. PROPOSED LOGIC (finish — no code here)

1. Gate: Super admin only.  
2. UI: Case Files list toolbar — date From/To, sort (date / time / user), Export.  
3. Server: new read-only report route that scans Case Files (and SOS-linked fields) for the range; flatten one row per case using design §5 columns.  
4. Payload out: `text/csv` download; **no** write to case JSON; **no** change to Ack.  
5. First ship SOS-linked rows only if risk is high; then widen to analytics families without changing column names.

**Recommended next APPLY name:** keep `CASES-SUPERADMIN-REPORT-CSV-V1` (unchanged).

---

## 2. `SOS-OPS-ROW-TO-CASE-V1`

### A. FETCH — tied files

| Role | Path |
|------|------|
| Strip UI | `public/index.html` — `#sos-strip-open-case`, SOS ledger strip |
| Strip handler | `public/index.html` inline `openSosCaseFromStrip` |
| API | `GET /api/case-files/by-sos/:sosIncidentId` (`server.js`) |
| Birth / Ack wire | `caseFiles.ensureFromSos` on raise (`ensureOpsCaseOnRaise`) and on Ack (`server.js` SOS ack handler returns `opsCase` object that is actually a **Case File** id) |
| Target desk | `CaseFilesUi.openCase` / Evidence → Cases |

### B. BUG HUNT — where work stopped

1. **Button + navigation exist** — Open case → Evidence tab → Case Files.  
2. Lookup uses **Case Files by SOS**, not Ops Case JSON.  
3. Failure mode: if by-sos returns no case, UI still `goCases(null)` — operator lands on Cases **without** a focused row (soft miss, not a crash).  
4. Naming confusion: Ack JSON field `opsCase` is a Case File — leftover dual vocabulary.  
5. Orphan status is “named, not closed” because **operator PASS / genre close** was never recorded, not because the strip button is absent.

### C. PROPOSED LOGIC (finish)

1. Confirm lab: raise SOS → case file exists → Open case focuses that Case File.  
2. If miss: ensure raise/Ack always creates Case File before strip Open; on miss show one factual toast (no silent empty desk).  
3. Optionally rename response field later (separate copy MOB) — **do not** reintroduce `/api/ops-cases` for this strip.  
4. Record PASS or WAIVE in leftovers after one lab Ack + Open.

**Recommended next APPLY:** verify-only checkpoint, or tiny `SOS-OPS-ROW-TO-CASE-MISS-TOAST-V1` if null-focus fails operator PASS.

---

## 3. `CASE-FILE-CONTINUE-FROM-OPS-CASE-V1`

### A. FETCH — tied files

| Role | Path |
|------|------|
| APPLY disc | `docs/MOB-DISC-CASE-FILE-CONTINUE-FROM-OPS-CASE-APPLY-20260810.md` (claims APPLIED, PASS pending) |
| UI button | `#ops-cases-continue-case-file` in `#ev-panel-ops-cases` |
| UI logic | `public/js/ops-cases-ui.js` → `POST /api/ops-cases/:caseId/continue-case-file` |
| Case File helper | `lib/caseFiles.js` → `createFromOpsCase` (exported) |
| DB | migration `ops_case_id` on case files (`siteDb.findCaseFileByOpsCaseId`) |
| Nav reality | `evidence-hub.js` maps panel `ops-cases` → **`case-files`**; `#ev-nav-ops-cases` is **hidden** |

### B. BUG HUNT — where work stopped (critical)

1. Disc says APPLIED, but **Continue lives on the Ops Cases panel**, which nav no longer opens as a first-class panel.  
2. Client posts to **`/api/ops-cases/.../continue-case-file`** — **route not found mounted**; `opsCaseStore` **never required**.  
3. `createFromOpsCase` exists in library but is **orphaned** without a live HTTP caller path from the visible Cases UI.  
4. Result: feature is **half-shipped paper + dead wiring** — highest severity orphan in this audit set for Cases.

### C. PROPOSED LOGIC (finish)

**Pick one product truth (recommendation: Case Files are the ticket desk):**

1. Move or duplicate **Continue as Case File** onto the **visible Case Files detail** only if product still needs “Ops Case → narrative Case File” as a second object; **or** WAIVE Continue if Case Files already *are* the case.  
2. If Continue stays: mount a **single** server route that accepts the Case File / SOS / ops key already on the row, calls `createFromOpsCase` or ensure-link, returns `{ caseFileId }`, jumps UI — **do not** leave calls to unmounted `/api/ops-cases`.  
3. Either delete or quarantine dead `ops-cases-ui` panel after WAIVE, in a **named** cleanup MOB (not silent).  
4. Payload change: link field `opsCaseId` / `refs.linkedCaseFileId` written once; second click returns same id (idempotent).

**Recommended next APPLY:** `CASE-FILE-CONTINUE-REWIRE-OR-WAIVE-V1` (decide rewire vs WAIVE before coding).

---

## 4. `UI-DARK-FORM-CONTROLS-UNIFY-V1`

### A. FETCH

| Role | Path |
|------|------|
| APPLIED disc | `docs/MOB-DISC-UI-DARK-FORM-CONTROLS-UNIFY-V1-APPLIED.md` |
| CSS | `public/css/global.css` — dark `color-scheme`, select/file skins |
| Cache bumps | Multiple HTML shells `global.css?v=20260731-dark-form-controls-unify-v1` |
| Known regression note | `docs/MOB-DISC-ANALYTICS-GRADE-FILTER-COMPACT-CHEVRON-V1-APPLIED-20260731.md` — Analytics select `background` shorthand wiped dark caret |

### B. BUG HUNT

1. Code **landed**; leftovers list as **PASS never recorded**.  
2. Risk remains: panel-local CSS using `background:` shorthand can **re-break** dark chevrons.  
3. Not a missing feature — **closure / regression watch**.

### C. PROPOSED LOGIC

1. Operator hard-refresh spot-check: Analytics grade select, file pickers, Settings selects.  
2. PASS or WAIVE via docs batch; no further invent.  
3. Any new white patch = separate named CSS fix MOB only.

---

## 5. Settings Theme V4 overhaul

### A. FETCH

| Role | Path |
|------|------|
| Theme CSS | `public/css/settings-theme-unify.css` (includes `MASTER-SETTINGS-GRID-AND-RULES-V4` East-to-West forms) |
| Link | `public/index.html` → settings-theme-unify cache query |
| Verifiers | `scripts/verify-master-settings-grid-v4.js`, `verify-settings-ui-theme-unify.js`, visual-overhaul scripts |
| Leftover | MASTER leftovers C1 — “visual PASS pending” |

### B. BUG HUNT

1. V4 grid rules **present in CSS**; scripted asserts exist.  
2. Stopped at **operator visual PASS**, not at missing files.  
3. Drift risk: later Settings HTML/CSS patches without cache bump or against East-to-West rule.

### C. PROPOSED LOGIC

1. Walk Settings cards (Fleet, Infrastructure, Users and Security, Alarms) for grid/form control look.  
2. Record PASS/WAIVE; only open a new MOB if a concrete panel still white-patches or stacks vertical on wide screens.

---

## 6. Evidence Redaction visual passes

### A. FETCH

| Role | Path |
|------|------|
| UI | Evidence Hub redact workspace + Redacted Exports (`public/js/evidence-hub.js`, related redact UI, `public/index.html` panels) |
| License gate APPLY | `docs/MOB-DISC-REDACT-LICENSE-GREY-BUTTON-APPLY-20260810.md` |
| Many visual APPLIED discs | Redacted exports empty/compact/row/detail/scroll/finalize family under `docs/MOB-DISC-REDACT*` / `REDACTED-EXPORTS*` |
| Leftover | MASTER C1 redact family + license grey — PASS pending |

### B. BUG HUNT

1. Genre is **mostly APPLIED in code**; orphaned by **missing official PASS/WAIVE**.  
2. Product risk left is UX clarity (finalize/download loop historically), not missing CSS file names.  
3. License grey button: APPLIED; needs license on/off lab check.

### C. PROPOSED LOGIC

1. Batch operator PASS/WAIVE with `DOCS-WAIVE-OR-PASS-NO-VIDEO-APPLIED-V1` (already named in leftovers) — **docs only**.  
2. Code only if a named visual FAIL returns (separate APPLY).

---

## 7. `CONFERENCE-BWC-INGRESS-WVP-HANDOFF-V1`

### A. FETCH

| Role | Path |
|------|------|
| Harm / backlog | WVP harm B10; `MOB-DISC-WAKE-STILL-TO-FINISH-…`; `MOB-DISC-MASTER-BACKLOG-…` A9 |
| Backend | `lib/conferenceModule.js` `addBwcIngress` — branches `wvpVideoHandoff.isHandoffEnabled()` → `startFromWvpFlv` vs Fleet pool RTP mirror |
| API | `POST/DELETE /api/conference/room/:roomId/bwc-ingress` in `server.js` |
| Frontend | `public/js/conference-hub.js` share/remove BWC ingress + socket events |
| LiveKit / RTMP | `conferenceLivekit.createBwcIngress`, `conferenceBwcIngress` |

### B. BUG HUNT

1. **Handoff branch is implemented in code** (not a blank stub).  
2. Orphan status = **lab PASS not closed** / historical “broken under handoff when pool INVITE skipped”.  
3. Failure modes still to prove: WVP acquire fail → error thrown and ingress deleted; FLV→RTMP pipeline flaky; LiveKit ingress without usable media; permission `conferenceBwcShare`.  
4. Race: conference ref count vs `releaseForConference` / pool release on failure paths — must be re-verified under live handoff, not assumed fixed by presence of branch.

### C. PROPOSED LOGIC

1. Lab with `FM_WVP_VIDEO_HANDOFF` on: share one BWC into Room → tile shows live → remove share clean.  
2. If FAIL: capture reason (`WVP conference source failed` vs LiveKit vs RTMP publish) — one surgical MOB, **do not** turn handoff off.  
3. Payload unchanged at API level (`bwcIngress` with `sourceMode: 'wvp-zlm'`); fix is pipeline reliability, not new product surface.

**Recommended next APPLY:** keep name; require lab FAIL evidence before code.

---

## 8. HQ per-action tones (V2) / session mute

### A. FETCH

| Role | Path |
|------|------|
| Design | `docs/MOB-DISC-HQ-ALERT-CUSTOM-TONE-HOW-20260810.md` Phase B `HQ-ALERT-PER-ACTION-TONES-V2` |
| Presets / hold | `docs/MOB-DISC-HQ-ALERT-TONE-PRESETS-HOLD-*.md` |
| UI | Settings Alerts — `hqAlertAudio.*` in `public/index.html` |
| Client | `public/js/hq-alert-audio.js` (+ `voice-alerts.js` play path) |
| Server | `lib/hqAlertTones.js` — **slots fixed: `sos`, `analytics` only**; routes `/api/hq-alert-tones*` in `server.js` |
| Leftover | MASTER C2 “HQ per-action tones V2 / session mute” |

### B. BUG HUNT

1. **V1 shipped:** SOS vs Analytics presets, hold seconds, enable toggles per family (weapon/fr/anpr/sos), custom file per **two** slots.  
2. **V2 not started:** no separate Weapon / Face / Plate / Fall custom or preset slots in `hqAlertTones.SLOTS`.  
3. Session mute: header mute/repeat **removed by design**; mute is Settings checkboxes — not missing unless operator still wants a header control (would be a new named MOB).  
4. Orphan = **optional Phase B**, not a broken V1 mount.

### C. PROPOSED LOGIC

1. Extend slots to weapon / fr / anpr (/ fall optional) in store + Settings table + player resolution order.  
2. Payload: meta JSON gains per-slot mode/file/preset; player picks slot by alert family instead of collapsing analytics.  
3. Do **not** bundle with V1 re-PASS; only after operator wants V2.

**Recommended next APPLY:** `HQ-ALERT-PER-ACTION-TONES-V2` when ready.

---

## Execution order (single recommendation)

| Order | Item | Why |
|------:|------|-----|
| 1 | **Case dual-path truth** — rewire Continue **or** WAIVE Ops Case desk | Unmounted `/api/ops-cases` is active debt; blocks honest Cases cleanup |
| 2 | `SOS-OPS-ROW-TO-CASE` lab PASS (or miss-toast) | Strip already on Case Files path |
| 3 | `CASES-SUPERADMIN-REPORT-CSV-V1` | Needs stable Case Files as report source |
| 4 | Docs PASS/WAIVE batch — Dark forms, Settings V4, Redact visuals | No video required |
| 5 | `CONFERENCE-BWC-INGRESS-WVP-HANDOFF-V1` lab | Needs live BWC + handoff |
| 6 | `HQ-ALERT-PER-ACTION-TONES-V2` | Optional polish |

---

## Explicit non-goals of this disc

- No code, no APPLY execution, no invent of new product names beyond finishing the listed orphans.  
- No ship/pack checklist.  
- No WVP “turn handoff off” recommendation.

---

## Operator next step

Reply with one:

- `MOB-APPLY CASE-FILE-CONTINUE-REWIRE-OR-WAIVE-V1` (agent will discuss rewire vs WAIVE first if still ambiguous), **or**  
- `PASS` / `WAIVE` any closed visual orphan after hard refresh, **or**  
- name the next single orphan from the order table above.
