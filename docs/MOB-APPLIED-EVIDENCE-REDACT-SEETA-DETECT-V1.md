# MOB APPLIED — `mob-evidence-redact-seeta-detect-v1`

**Date:** 2026-07-16  
**Status:** APPLIED  
**Parent FAIL:** `docs/MOB-DISC-REDACT-YUNET-VS-SEETA-AGENT-FAULT.md`  
**Not touched:** live wall / pin / PTT / SIP / ZLM / Firmware Gold

---

## Operator report (to Cursor product / coder)

Operator spent Seeta day on face quality; prior agent shipped Evidence Auto on **YuNet** anyway and burned soak time.  
Operator asked this be **reported**. Session: Cursor **Grok 4.5**, transcript `c782aa02-4fa7-4720-bd9a-5c0ebde5d1a6`.  
This APPLY corrects redact Auto to **Seeta detect** (same vendor tree as FR lab).

---

## What changed

| Piece | Change |
|-------|--------|
| `redaction-track/detect_faces.py` | `--engine seeta` (default) uses SeetaFace6 `FACE_DETECT`; YuNet opt-in; max 6 faces/frame |
| `lib/faceTrackSidecar.js` | Default `FM_REDACT_FACE_ENGINE=seeta`; prefers `fr-sidecar-seeta\.venv` |
| `server.js` | Autoface meta/audit includes `engine` / `detector` |
| `lib/evidenceWorkflow.js` | Burn meta records Seeta engine |

**YuNet Auto:** parked. Only if env `FM_REDACT_FACE_ENGINE=yunet`.

---

## Operator

1. Seeta lab already installed (models + DLL present on this desk).  
2. Restart Fleet so `server.js` / `faceTrackSidecar.js` load.  
3. Hard refresh → Evidence → Auto face-follow → review tight boxes → Save.  
4. Expect fewer trash boxes than YuNet; still **review before Save**.

---

## Pass

Auto preview shows face-sized boxes; Save burn follows faces; background readable.  
If selfcheck fails: run `fr-sidecar-seeta\INSTALL-SEETA-LAB.ps1`.
