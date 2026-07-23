# MOB DISC — END-TO-END-UI-CONSOLIDATION-V1

**Date:** 2026-07-23  
**Phrase (when ready):** `MOB-APPLY MOB-EXECUTE-END-TO-END-UI-CONSOLIDATION-V1`  
**Status:** APPLIED — see `docs/MOB-APPLIED-END-TO-END-UI-CONSOLIDATION-V1-20260723.md`

## Operator pain (understood)

Piecemeal UI MOBs (encoding, cards, FR, Storage, copy) made the console look **patched**, not one product. Goal: one dark enterprise look, compact, no FR matrix scrollbar.

## What already exists (do not reinvent)

| Piece | Status |
|-------|--------|
| `public/css/global.css` | **Already** has `--bg-base`, `--bg-surface`, `--border-color`, `--text-primary`, `--accent-blue`, `--space-sm`…`--space-xl`, `.enterprise-card`, `.btn-primary` / `.btn-secondary`, layouts |
| Settings / VC / Evidence Storage | Partially retrofitted (`ESTABLISH-GLOBAL-ENTERPRISE-DESIGN-SYSTEM-V1`) |
| FR 3×2 + no grid scroll | Already in `index.html` as `KILL-FR-GRID-SCROLLBAR-V1` (`.ax-fr-grid { overflow: hidden; … 3×2 }`) |
| Link to `global.css` | Already in dashboard `index.html` |

**Real problem:** huge **inline `<style>`** in `index.html` still fights / duplicates the design system → uneven outlook. Consolidation = finish wiring + move the two named views fully onto tokens, not a second design system.

## Proposed EXECUTE scope (agent recommendation)

### Phase 1 — Checkpoint (on APPLY only)

- Commit a rollback point **before** edits.
- **Risk on `git add .`:** this working tree is very dirty (baselines, android proofs, many docs). Blind `git add .` may bag unrelated churn into the “UI checkpoint.”
- **Agent pick:** on APPLY, stage **UI-relevant paths** for the checkpoint message *or* ask once if operator truly wants **everything** untracked/modified in that backup commit. Default if operator insists on exact phrase: run their `git add .` + commit as written (they own the bag size).

### Phase 2 — Design system

- **Update** existing `public/css/global.css` (not create a parallel file).
- Add/confirm `.enterprise-layout-2col` as **`1fr` + `350px`** (Storage target; distinct from current `.enterprise-page-layout` 300px+1fr).
- Confirm form max-width utility (e.g. `.enterprise-form-control { max-width: 400px; }` or scoped under Storage).
- Do **not** invent new brand colors; keep locked dark enterprise tokens.

### Phase 3 — Views only (named)

1. **Analytics / FR (in `index.html`, not a separate product app)**  
   - Enforce zero scrollbar on the 6-tile matrix; 3×2 locked to available height.  
   - Bottom roster/controls in `.enterprise-card`.  
   - Move FR layout rules into `global.css` (scoped `#ax-…` / `.ax-fr-…`) and delete **duplicate** inline rules for that scope only.

2. **Evidence → Storage**  
   - `.enterprise-layout-2col` (config left, status right 350px).  
   - Inputs max-width ~400px.  
   - Drop redundant heavy nested borders; use `.enterprise-card` once per block.

### Explicitly NOT in this MOB

- `server.js`, SIP, PTT, WebRTC, any backend  
- `video-wall.js`, Leaflet / map pin logic  
- No removal of element `id`s / `data-*`  
- **Not** “delete the entire `index.html` `<style>` block” in one shot — that would break SOS/map/wall chrome and look worse. Strip only FR + Storage duplicates; other pages stay for later named MOBs.

## Safety boundaries (locked)

Same as operator brief: backend untouched; IDs/`data-*` kept; no `video-wall.js` / map JS.

## Success look

One dark enterprise surface language on FR + Storage; FR matrix **never** scrolls; Storage forms don’t stretch forever; Ctrl+F5 enough to verify.

## Next step

Operator types:  
`MOB-APPLY MOB-EXECUTE-END-TO-END-UI-CONSOLIDATION-V1`  
→ Phase 1 commit → Phase 2 CSS → Phase 3 FR + Storage only.
