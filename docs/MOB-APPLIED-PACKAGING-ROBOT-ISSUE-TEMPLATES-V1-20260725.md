# MOB-APPLIED — Task 3.3 Packaging Robot & Issue Templates

**Date:** 2026-07-25  
**Execute:** Task 3.3 — GitHub Release Pipeline + issue templates  
**Status:** Code landed — awaiting operator review (workflow runs only after push + published release)

## Goal

Automate protected ship zip + Docker release assets on `release: published`, and standardize team issue intake (bug / feature / license).

## What landed

| Piece | Path |
|-------|------|
| Packaging Robot | `.github/workflows/release.yml` |
| App Dockerfile | `docker/Dockerfile` (Node 22 + `ship-build/protected`) |
| Docker ignore | `.dockerignore` |
| Bug template | `.github/ISSUE_TEMPLATE/bug_report.md` |
| Feature template | `.github/ISSUE_TEMPLATE/feature_request.md` |
| License template | `.github/ISSUE_TEMPLATE/license_request.md` |
| Template chooser | `.github/ISSUE_TEMPLATE/config.yml` |
| Engineer guide | `docs/RELEASE_GUIDE.md` |

## Release assets (per published tag)

1. `mobility-axiom-protected-<tag>.zip` — `npm run build:ship` + prod `node_modules`
2. `mobility-axiom-docker-stack-<tag>.zip` — `docker/` compose stack
3. `mobility-axiom-<tag>.tar.gz` — `docker save` of production image

Optional GHCR push when repo variable `PUSH_DOCKER_TO_GHCR=true`.

## Notes

- Existing `docker/` had **no** app Dockerfile (only Valkey/Postgres/WVP/ZLM images). Added `docker/Dockerfile` for the protected runtime; sidecars stay compose-based.
- License UI grey-out remains a **later** Phase 3 task (not this MOB).
- Workflow is inert until these files are on the default branch and a Release is **published**.

## Operator review

1. Push this change set to GitHub when ready.
2. Optionally cut a **draft** release first, then publish a test tag (e.g. `v0.0.0-packaging-robot-smoke`).
3. Confirm Actions green and three assets appear on the Release.
4. PASS → then open next Phase 3 item when you choose.
