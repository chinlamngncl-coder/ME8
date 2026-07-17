# MOB APPLIED — safety-commit-keep-fr-redact

**Date:** 2026-07-17  
**APPLY:** `MOB-APPLY safety-commit-keep-fr-redact`  
**Disc:** `docs/MOB-DISC-KEEP-SEETA-FR-REDACT-WHILE-UNDO-SOFTOPEN-20260717.md`

## What

Git commit **only** Seeta FR / evidence redaction keep-pile so ~2 days of work is on `main` history (local). **Not** Soft Open live-only files. **No push** in this APPLY.

## Included (keep)

- Evidence / redact UI + engine: `evidence-hub.js`, `faceRedactRegions.js`, `faceTrackSidecar.js`, `evidenceWorkflow.js`, `detect_faces.py`, `auditActionLabels.js`, `siteDb.js`, locales
- Mixed but required for redact UI/API freeze: `public/index.html`, `server.js`
- Sidecars: `fr-sidecar-seeta/` app + install scripts (venv/models ignored; **vendor/seetaFace6Python nested git not committed** — stays on disk / reinstall via INSTALL), `fr-sidecar-fast/`, `START-FACE-MATCHING.bat`
- `.gitignore` FR sidecar ignore lines (if present in working tree)
- Evidence/redact APPLIED + keep/git DISCs for this freeze

## Excluded (Soft Open / WVP live storm — leave dirty)

- `video-wall.js`, `live-player-factory.js`, `wvp-lab-tile.js`
- `livePlaybackBroker.js`, `wvpLabClient.js`, `zlm*`, docker WVP, Soft Open APPLIED docs, etc.

## Note

`index.html` / `server.js` still contain Soft Open bits **and** redact — frozen together so redact cannot vanish. Later live undo must be **surgical**, not blind checkout of those two.
