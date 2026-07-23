# MOB DISC — Redaction UI today: committed? pushed?

**Date:** 2026-07-17  
**Status:** DISC — fact check  
**Ask:** Was today’s redaction UI committed?

---

## Answer

# YES — committed **and** already on GitHub

| | |
|--|--|
| Commit | `0dc4486` — `lab-safety-keep-fr-redact: freeze Seeta FR + evidence redact UI on git` |
| Push | Done earlier (`MOB-APPLY lab-git-push-safety-fr-redact`) → `origin/main` |
| Includes UI | `public/js/evidence-hub.js`, redact CSS/workspace in `public/index.html`, locales |
| Includes engine | `detect_faces.py`, face/redact libs, evidence workflow, Seeta sidecar **app** layer, `server.js` wiring |

**Not** in that commit (still only on disk, optional reinstall): `fr-sidecar-seeta/vendor/seetaFace6Python/` (nested vendor — INSTALL script / local vendor). Your **UI + ME8 code** are safe on GitHub.

---

## Do not confuse

| Commit | What |
|--------|------|
| `0dc4486` (pushed) | **Redact UI + FR** ← this is today’s redaction work |
| `9155950` (local, ahead 1, not pushed yet) | Service + WVP infra + ZLM pack — **not** redact |

---

## One line

**Yes — today’s redaction UI is in `0dc4486` and already pushed to GitHub.**
