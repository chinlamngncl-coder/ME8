# MOB APPLIED — END-TO-END-UI-CONSOLIDATION-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY MOB-EXECUTE-END-TO-END-UI-CONSOLIDATION-V1`  
**Disc:** `docs/MOB-DISC-END-TO-END-UI-CONSOLIDATION-V1-20260723.md`

## Phase 1 — Checkpoint

Commit: `97c38ab` — `auto-backup: checkpoint before global UI consolidation`

Rollback: `git reset --hard 97c38ab` (operator only; destroys later uncommitted work).

## Phase 2 — Design system (`public/css/global.css`)

- Kept existing tokens (`--bg-base`, `--bg-surface`, `--border-color`, `--text-primary`, `--accent-blue`, `--space-sm`…`--space-xl`).
- Added **`.enterprise-layout-2col`** → `1fr` + `350px` (stacks at ≤1000px).
- Added **`.enterprise-form-control`** / tightened **`.form-control`** → `max-width: 400px` (does not blanket-cap all Settings/VC inputs).
- FR face-panel layout rules live under `#ax-panel-face.enterprise-scope` (3×2 grid, `overflow: hidden`, `flex-grow: 1`).
- Storage section + status rail card chrome owned here.

## Phase 3 — Views

| View | Change |
|------|--------|
| **Analytics → Face** | `#ax-panel-face` + `enterprise-scope`; watch list stays `.enterprise-card`; matrix locked 3×2, no grid scrollbar |
| **Evidence → Storage** | `.ev-hub-layout.enterprise-layout-2col`; status rail `.enterprise-card`; FTP/path inputs get `.enterprise-form-control` |

**Not touched:** `server.js`, SIP/PTT/WebRTC, `video-wall.js`, Leaflet/map JS. All element `id`s / `data-*` kept.

**Cache:** `/css/global.css?v=20260723-ui-consolidation-v1`

## Operator verify

1. **Ctrl+F5**
2. **Analytics → Face recognition** — 6 tiles in 3×2; **no scrollbar on the video grid**; bottom roster in a card
3. **Evidence → Storage** — left config / right System status (~350px); FTP host & paths stop at ~400px; cards look lighter (less nested boxes)
4. **Map / Open All** — unchanged

**PASS** = FR matrix fills height without scrolling; Storage looks one enterprise layout.  
**FAIL** = grid scrolls or forms stretch full width again.

## Operator result

**PASS** (2026-07-23) — operator confirmed.
