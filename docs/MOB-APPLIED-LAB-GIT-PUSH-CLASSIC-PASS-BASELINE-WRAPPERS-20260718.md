# MOB APPLIED — lab-git-push-classic-pass-baseline-wrappers

**Date:** 2026-07-18  
**APPLY:** `MOB-APPLY lab-git-push-classic-pass-baseline-wrappers`  
**Prior disc:** `MOB-DISC-CLASSIC-PASS-WRAPPERS-MANIFEST-GITHUB-20260718.md`

## Mandate

Push **safe** classic-PASS restore tooling to GitHub — wrappers, MANIFEST, HASHES, BASELINE doc.  
**Never** push snapshot `.env` / secrets. Full 2510-file pack stays on disk + `ME8-BACKUPS`.

## Included on git

- Root: `CREATE` / `RESTORE` / `VERIFY` + `BASELINE-ME8-CLASSIC-PASS-20260718.md`
- `baseline/2026-07-18-classic-pass/` scripts + `MANIFEST.json` + `HASHES.json`
- `.gitignore` allowlist for classic-PASS (and Pre-Gate-C) scripts; block `baseline/**/.env`
- Related MOB DISC / APPLIED paper

## Not on git

- Snapshot `.env`, full tree under `baseline/**` (still gitignored)
- `ME8-BACKUPS/2026-07-18-classic-pass/` (outside / local)

## Restore on this PC (100%)

```
RUN RESTORE-ME8-CLASSIC-PASS-20260718
```
