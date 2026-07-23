# MOB DISC — Repo Cleanup Inventory, No Delete

**MOB:** `mob-repo-cleanup-inventory-no-delete`  
**Date:** 2026-07-15  
**Status:** APPLIED AS INVENTORY ONLY — no files deleted, moved, or ignored  
**Purpose:** classify current untracked files before any cleanup MOB.

---

## Snapshot

`git ls-files --others --exclude-standard` reports **24,153** untracked non-ignored files.

Top-level breakdown:

| Count | Path |
|---:|---|
| 24,053 | `fr-sidecar-fast/` |
| 55 | `docs/` |
| 15 | root files |
| 9 | `android/` |
| 7 | `fr-sidecar-seeta/` |
| 6 | `scripts/` |
| 3 | `baseline/` |
| 2 | `vendor/` |
| 2 | `docker/` |
| 1 | `public/` |

The tree looks messy mainly because `fr-sidecar-fast/.venv/` is untracked and contains most of the files.

---

## Category A — Safe Generated Cleanup Candidate

These are likely generated/local runtime artifacts. They are cleanup candidates, but should still be deleted only by a named cleanup MOB.

| Path | Reason |
|---|---|
| `fr-sidecar-fast/.venv/` | Python virtual environment; 24,047 untracked files |
| `fr-sidecar-fast/__pycache__/` | Python bytecode cache |
| `scripts/fr-bench/__pycache__/` | Python bytecode cache |

Recommended future MOB:

`MOB-APPLY mob-repo-cleanup-generated-files`

Expected action in that future MOB:

- delete only cache/venv generated files;
- add ignore rules for `.venv/` and `__pycache__/`;
- do not delete source files such as `fr-sidecar-fast/app.py`.

---

## Category B — Keep / Commit Review

These look like real source, docs, or configuration. Do **not** delete casually.

| Path | Reason |
|---|---|
| `docs/MOB-DISC-WVP-ZLM-FFMPEG-FALLBACK-ARCHITECTURE.md` | Just-created architecture MOB; should be committed in next checkpoint |
| `fr-sidecar-seeta/app.py` | Active Seeta FR sidecar source |
| `fr-sidecar-seeta/requirements.txt` | Active Seeta sidecar dependency list |
| `fr-sidecar-seeta/README.md` | Sidecar documentation |
| `fr-sidecar-seeta/INSTALL-SEETA-LAB.ps1` | Lab install helper |
| `fr-sidecar-seeta/START-SEETA-LAB.bat` | Lab start helper |
| `fr-sidecar-seeta/vendor/seetaFace6Python/` | Vendor Seeta Python wrapper needed by Seeta path |
| `vendor/zlmediakit/README.md` | ZLM pack/vendor note |
| `vendor/zlmediakit/config.ini.example` | ZLM pack/vendor config example |
| `docker/wvp/zlm-bundled/README.md` | WVP/ZLM bundle note |
| `docker/wvp/zlm-bundled/config.ini` | WVP/ZLM bundled config candidate |
| `public/css/app-select-guard.css` | UI/source file, not generated |

Recommended future MOB:

`MOB-APPLY mob-repo-cleanup-commit-active-source`

Expected action in that future MOB:

- decide which of these are part of active FR/WVP/ZLM;
- stage/commit the accepted files;
- leave rejected files for a later delete MOB.

---

## Category C — Docs / Decision History

There are 55 untracked docs. They are messy, but many capture decisions that prevent repeated mistakes.

Examples:

| Path group | Meaning |
|---|---|
| `docs/MOB-DISC-BWC-*` | BWC button / vendor / companion architecture history |
| `docs/MOB-DISC-FLEET-*` | Fleet uptime / boot / EPIPE / restart notes |
| `docs/MOB-DISC-MAP-*` | Map pin/overlap/restore history |
| `docs/MOB-DISC-SOS-*` | SOS behavior notes |
| `docs/MOB-DISC-SEC-*` | Security hardening queue |
| `docs/MOB-DISC-WAKE-UP-*` | Work queue snapshots |
| `docs/MOB-APPLIED-SEC-*` | Security patches already applied locally |

Risk of deletion: **medium to high**. These are not runtime files, but deleting them loses discussion history and may cause future agents to repeat bad paths.

Recommended future MOB:

`MOB-APPLY mob-repo-cleanup-docs-classify`

Expected action:

- keep docs that encode locked decisions;
- archive stale docs into a dated folder if needed;
- do not delete security/SOS/PTT/Firmware-related history without explicit approval.

---

## Category D — Baseline / Restore Artifacts

Root files:

| File group | Risk |
|---|---|
| `BASELINE-ME8-PRE-GATE-C.md`, `CREATE-ME8-PRE-GATE-C.ps1`, `RESTORE-ME8-PRE-GATE-C.ps1`, `VERIFY-ME8-PRE-GATE-C.ps1` | rollback baseline candidate; do not delete unless replaced |
| `BASELINE-ME8-FAILED-LIVE-V1.md`, `CREATE-ME8-FAILED-LIVE-V1.ps1`, `RESTORE-ME8-FAILED-LIVE-V1.ps1`, `VERIFY-ME8-FAILED-LIVE-V1.ps1` | failure snapshot; useful for postmortem, not product runtime |
| `baseline/2026-07-14-pre-gate-c/` | full baseline directory; likely large but rollback-relevant |

Risk of deletion: **high** unless we confirm a newer committed baseline supersedes them.

Recommended future MOB:

`MOB-APPLY mob-repo-cleanup-baseline-archive-plan`

Expected action:

- identify which baseline is current rollback truth;
- commit or archive the current one;
- delete only superseded failed snapshots after explicit approval.

---

## Category E — Service / Packaging Scripts

Root and scripts:

| Path | Risk |
|---|---|
| `INSTALL-UBITRON-SERVICE*.bat/.vbs/.ps1` | service install work; may be useful for ship/service lane |
| `START-UBITRON-SERVICE.bat` / `STOP-UBITRON-SERVICE.bat` | service run helpers |
| `UNINSTALL-UBITRON-SERVICE.ps1` | service uninstall helper |
| `scripts/me8-ship/Get-Nssm.ps1` | service dependency helper |
| `scripts/me8-ship/Install-UbitronC2-Service.ps1` | ship/service install script |
| `scripts/me8-ship/Uninstall-UbitronC2-Service.ps1` | ship/service uninstall script |
| `scripts/runtime/nssm/win64/nssm.exe` | binary runtime dependency; license/pack decision needed |

Risk of deletion: **medium to high**. These are not part of current FR/WVP work, but likely part of Windows service/ship work.

Recommended future MOB:

`MOB-APPLY mob-repo-cleanup-service-scripts-review`

Expected action:

- decide if Windows service lane is active;
- commit source scripts if active;
- do not commit binary `nssm.exe` until license/pack policy is confirmed.

---

## Category F — Android Companion

Untracked:

`android/bwc-companion-f4-proof/`

Contents include Gradle files, manifest, accessibility config, and `SosInterceptorService.java`.

Risk of deletion: **medium**.

This APK path was parked after the no-APK decision. It may still be useful as historical proof or future lab spike, but should not be part of active customer software unless explicitly revived.

Recommended future MOB:

`MOB-APPLY mob-repo-cleanup-android-companion-park`

Expected action:

- either archive as parked lab experiment;
- or delete only after user confirms no future APK path is wanted.

---

## Immediate Recommendation

Do **not** run broad cleanup.

Best order:

1. Commit `docs/MOB-DISC-WVP-ZLM-FFMPEG-FALLBACK-ARCHITECTURE.md` and this inventory doc in the next checkpoint.
2. Apply generated cleanup only:
   `MOB-APPLY mob-repo-cleanup-generated-files`
3. Then review docs/baselines/service scripts one lane at a time.

---

## Red Lines

Never delete these with a broad command:

- `baseline/**`
- `RESTORE-*`
- `VERIFY-*`
- `fr-sidecar-seeta/**`
- `vendor/zlmediakit/**`
- `docs/MOB-DISC-SEC-*`
- `docs/MOB-DISC-SOS-*`
- `docs/MOB-DISC-BWC-*`
- anything under Firmware Gold locks or live/pin/PTT paths

---

## Bottom Line

The repo is messy, but most mess is **classifiable**, not random.

The first safe cleanup is generated files only. The dangerous cleanup is baselines, parked docs, service scripts, and active FR/ZLM sidecar files.
