# Release guide — Packaging Robot

How an engineer cuts a Mobility Axiom release, lets GitHub Actions build the protected pack, and sends the zip to a customer.

Related:

- Task 3.1 license: `docs/MOB-APPLIED-AIRGAP-LICENSE-LIC-ED25519-V1-20260725.md`
- Task 3.2 local pack: `docs/MOB-APPLIED-CODE-PROTECTION-SHIP-PACKAGING-V1-20260725.md`
- Workflow: `.github/workflows/release.yml`

## What the robot produces

When you **publish** a GitHub Release, the Packaging Robot attaches:

| Asset | Contents |
|-------|----------|
| `mobility-axiom-protected-<tag>.zip` | `ship-build/protected/` after `npm run build:ship` + production `node_modules` (no `server.js` / `lib/`) |
| `mobility-axiom-docker-stack-<tag>.zip` | `docker/` compose files (Valkey/Postgres, WVP/ZLM, LiveKit) |
| `mobility-axiom-<tag>.tar.gz` | `docker save` of the production app image built from `docker/Dockerfile` |

Optional: if repository variable **`PUSH_DOCKER_TO_GHCR=true`**, the same image is also pushed to:

`ghcr.io/<owner>/mobility-axiom:<tag>` and `:latest`

Customer **still** needs a signed `storage/license.lic` for their server HWID (never bake a customer license into the public zip).

## Prerequisites

1. Code for the release is merged and pushed to the branch you will tag.
2. You can create tags / releases on the GitHub repo.
3. Local smoke (recommended before tagging):

```bat
cd /d "C:\Users\user\Desktop\Enterprise Mobility\ME8"
npm run build:ship
npm run verify:ship-protected
```

4. Never commit `license-private.pem`, `.env` secrets, or customer `license.lic`.

## Step-by-step (engineer)

### 1. Decide the version tag

Use a clear SemVer-style tag, for example:

- `v1.0.6`
- `v1.0.6-ph-kr`

Tag name becomes the zip / image suffix.

### 2. Create and push the Git tag

From a clean tree on the commit you want to ship:

```bash
git status
git tag -a v1.0.6 -m "Mobility Axiom v1.0.6"
git push origin v1.0.6
```

### 3. Publish a GitHub Release (this starts the robot)

1. Open the repo on GitHub → **Releases** → **Draft a new release**
2. Choose the tag you just pushed (or create the tag in the UI from the target commit)
3. Title / notes: what changed; mention license still separate
4. Click **Publish release** (not “Save draft”)

Publishing fires `.github/workflows/release.yml` (`on: release: types: [published]`).

### 4. Wait for the Packaging Robot

1. Open **Actions** → workflow **Packaging Robot**
2. Confirm the run for your tag is green
3. Open the Release page — the three assets should appear under the release

If the job fails: fix on a branch, retag or edit/re-publish only after a new tag (do not re-use a broken tag for customer packs).

### 5. Issue license (per customer)

Use issue template **License request** (internal), then on the **vendor** machine:

```bash
node tools/generate-license.js --print-hwid   # on customer server only
# then generate+sign license.lic offline with private key
```

Deliver **only** `license.lic` to the customer (plus the release zip). They place it under `storage/` and restart.

### 6. Hand the package to the customer

Typical delivery:

1. `mobility-axiom-protected-<tag>.zip` — extract, configure `.env`, drop `license.lic`, `node run.js` (or Start bat if you add it in a fuller pack later)
2. Optional: `mobility-axiom-docker-stack-<tag>.zip` — sidecars (`docker compose -f docker/docker-compose.enterprise.yml up -d`, plus WVP/ZLM as needed)
3. Optional air-gap Docker: load `mobility-axiom-<tag>.tar.gz` with `docker load`, then run with a mounted `storage/` containing `license.lic`

Do **not** send:

- `license-private.pem`
- Lab `.env` with real passwords
- Source `server.js` / `lib/` trees (robot zip already excludes them)

## Local equivalent (no GitHub)

```bash
npm ci
npm run build:ship
cd ship-build/protected && npm install --omit=dev
# zip ship-build/protected yourself
docker build -f docker/Dockerfile -t mobility-axiom:local .
```

## Repository knobs

| Variable / setting | Effect |
|--------------------|--------|
| `PUSH_DOCKER_TO_GHCR=true` | Push image to GHCR in addition to attaching `.tar.gz` |
| `FM_SHIP_OBFUSCATE=1` | Stronger obfuscation during `build:ship` on the runner |

Set under GitHub → **Settings** → **Secrets and variables** → **Actions** → **Variables**.

## Checklist before calling a customer “shipped”

- [ ] Release Actions run green
- [ ] Protected zip downloads and contains `run.js` (no `lib/`)
- [ ] Customer HWID collected from **their server**
- [ ] Signed `license.lic` issued and tested once on a spare PC or staging HWID if available
- [ ] Customer told: restart after license drop; Ctrl+F5 after UI updates

## Issue templates

Under **New issue**:

- **Bug report** — field/client bugs
- **Feature request** — client asks
- **License request** — internal `.lic` generation form
