# MOB DISC — in-app evidence redaction (no external tool)

**Status:** **APPLIED** 2026-07-06 (`mob-evidence-redact-simple-flow-with-draft-note`).  
**Supersedes:** external `MobilityRedact` / `Apply-Redaction.ps1` / “open tools folder” wording in `MOB-DISC-ENTERPRISE-VMS-SIX-DOMAINS.md`.  
**MOB genre:** `mob-evidence-redact-simple-flow-with-draft-note`  
**Risk:** **2** — Evidence Hub + server ffmpeg only; does **not** touch wall · PTT · SIP.

---

## Decision (operator rule)

**Redaction is inside the program.** No separate install, no external app, no “open product tools folder”, no officer PC setup.

| Not allowed | Allowed |
|-------------|---------|
| Packaged `tools/MobilityRedact/` sidecar | One flow in **Evidence Hub** |
| Run `.bat` / `.ps1` on workstation | Server uses **bundled ffmpeg** (same as trim export today) |
| Download → redact elsewhere → upload manually as only path | Select file → mark → save redacted copy **in product** |
| Merry-go-round alerts and handoffs | Single guided panel, same dark ops UI |

Tender story: *“Redaction is performed within the VMS; original recording remains sealed; derivative copy and notes are logged.”* (S4-9)

---

## Simple flow (locked)

```
Evidence Hub → Select file → Redact (in-app) → Save redacted copy
    → Officer/investigator draft note → Super-admin finalize → Export/Register
```

### Step detail

| Step | Who | What |
|------|-----|------|
| 1 Select | View permission + dispatch scope | File from docking ingest or catalog |
| 2 Redact | Super-admin opens workspace | Video preview + drag blur regions (pause/play) |
| 3 Save copy | Super-admin | Server renders `*_redacted.mp4` via bundled ffmpeg; original untouched |
| 4 Draft note | Officer or investigator | Short structured fields (see below) |
| 5 Finalize + export | Super-admin | Approve note + register export; audit |

---

## In-app redaction workspace (UI theme)

Same Evidence Hub patterns: `ev-detail-grid`, `btn-action` / `btn-ghost`, modal or inline panel — **not** a new product.

**Mark-up (in browser):**
- Load preview from existing `/api/evidence/preview/:id`
- Pause video, drag rectangles on canvas overlay (same interaction as legacy Mobility Redact, but **embedded**)
- Undo last region; list marked areas with time range

**Apply (on server):**
- `POST /api/evidence/redact` — regions JSON + file id
- `lib/evidenceWorkflow.js` — ffmpeg boxblur filter (same engine as trim export)
- Store as `exportType: redact` in Prior exports list

No new runtime dependency: `lib/ffmpegRuntime.js` + `resolveFfmpeg` already required for ship.

---

## Draft note (officer / investigator)

After redacted copy is saved, compact card — **not** a separate report module.

| Field | Purpose |
|-------|---------|
| Redaction reason | face · child · bystander · plate · other |
| Visible description | Observable only — e.g. *blue shirt, black cap* |
| Incident note | Scene context — e.g. *approached patrol car from left* |
| Drafted by | Auto username |
| Finalized by | Super-admin on approve |

**Rule:** describe what remains **visible**, not identity guesses.

---

## Roles

| Action | Officer / investigator | Super-admin |
|--------|------------------------|-------------|
| View evidence in scope | Yes | Yes |
| Open redact workspace | No | Yes |
| Save redacted copy | No | Yes |
| Draft note | Yes | Yes |
| Finalize + export/register | No | Yes |

---

## Audit (domain B)

| Event | Id |
|-------|-----|
| Redact job started | `evidence.redact_start` |
| Redacted copy saved | `evidence.redact_save` |
| Draft note saved | `evidence.redact_note_draft` |
| Finalized / exported | `evidence.redact_finalize` |

---

## MOB touch list (one genre)

| File | Change |
|------|--------|
| `public/js/evidence-hub.js` | Replace `openRedactTool` alert with in-app workspace + note card |
| `lib/evidenceWorkflow.js` | `applyRedaction(fileId, regions, actor)` |
| `server.js` | `POST /api/evidence/redact`, note save/finalize routes |
| `lib/siteDb.js` | Redaction note columns or meta JSON on export row |
| `public/locales/en.json` | Step labels only |

**Do not:** copy `tools/MobilityRedact/` into ME8 ship; remove `evidenceHub.redactPath` install-media copy at MOB-APPLY time.

---

## Bench

1. Docked file appears in catalog  
2. Super-admin: Redact → mark face → Save  
3. Officer drafts visible-description note  
4. Super-admin: Finalize → export appears in Prior exports  
5. Original preview unchanged; audit shows all four events  

---

Reply **`MOB-APPLY mob-evidence-redact-simple-flow-with-draft-note`** when ready (one MOB, low risk).
