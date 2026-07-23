# MOB APPLIED — FR-HOLDS-DISPOSITION-STATUS-V1

**Date:** 2026-07-22  
**Disc:** `docs/MOB-DISC-FR-HOLDS-DISPOSITION-LIFECYCLE.md` · `docs/MOB-DISC-INVESTIGATION-HOLDS-NO-CLOSE-ENTERPRISE-20260722.md`

## Problem

Investigation holds were an inbox with no exit — Keep piled forever with only Open / Copy ID.

## Applied

- **Status lifecycle** on each hold: `open` (default), `cleared`, `discarded` (linked reserved for later MOB).
- **Default list filter:** Open only.
- **Toolbar filter:** Open | Cleared | Discarded | All.
- **Clear hold:** reason picklist (false positive, known/cleared, duplicate, other) + optional note; files stay on disk.
- **Discard:** confirm dialog; soft-removes from Open list; audit kept.
- **Audit:** `analytics.fr_hold_cleared` / `analytics.fr_hold_discarded` + `storage/fr-kept/disposition.jsonl`.
- **API:** `GET /api/analytics/fr/kept?status=` · `POST /api/analytics/fr/kept/:id/disposition`.

## Files

- `lib/frKeptEvidence.js` — status, filter, `setDisposition`, disposition log
- `server.js` — list status param + disposition route
- `public/js/fr-kept-ui.js` — filter, chips, Clear/Discard, clear dialog
- `public/index.html` — toolbar, clear dialog, status chip CSS
- `public/locales/en.json` — i18n
- `lib/auditActionLabels.js` — audit labels

## Verify (operator)

1. **Restart server** (new API).
2. Ctrl+F5 Evidence → Investigation holds.
3. Default view = **Open** only.
4. On an open hold: **Clear** → pick reason → hold moves to Cleared filter.
5. **Discard** → confirm → hold moves to Discarded filter.
6. Files still in `storage/fr-kept/` on disk.

## Cache

- `fr-kept-ui.js?v=20260722-holds-disposition-v1`

## Out of scope (later MOBs)

- Hold number `IH-…`
- Link to Case file
- Hard delete (admin)
