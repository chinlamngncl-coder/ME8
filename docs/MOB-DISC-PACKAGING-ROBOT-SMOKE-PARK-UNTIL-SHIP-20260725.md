# MOB-DISC — Packaging Robot smoke: park until ship (designer-safe)

**Date:** 2026-07-25  
**Topic:** Task 3.3 “Engineer smoke after push” — how to do it in simple English, or park  
**Audience:** Operator (designer) + AI teammate  
**Status:** **LOCKED recommendation — PARK GitHub Actions smoke until pack / ship time**

---

## What this smoke even is

Task 3.3 built a **robot on GitHub**. It only wakes up when someone:

1. Pushes the new `.github/` files to GitHub, **and**
2. Creates a **Release** (a named version with a download page).

Then GitHub’s computers zip the protected pack and attach it to that Release page.

That is **not** the same as:

- Lab live video / BWC / license on your PC  
- `npm run build:ship` (already verified in Task 3.2)

So: **local pack works**. **GitHub robot untested until a real Release is published.**

---

## Risk pick (one recommendation)

| Option | Meaning | Risk |
|--------|---------|------|
| **A — Smoke now** | You (or AI with your OK) push, cut a test release tag, watch Actions | Needs GitHub account steps, tags, waiting on CI; easy to feel lost; blocks product focus mid–Phase 3 |
| **B — Park until ship** | Treat 3.3 as **code landed**; run robot smoke when you say **ship / pack / push genre** | Zero designer load now; small chance of a first-time CI glitch at pack time (fixable then) |

### Recommendation: **B — PARK until pack / ship**

**Why:** You are designer + operator for product PASS/FAIL. GitHub Releases + Actions are release plumbing. Task 3.2 already proved `build:ship` and license gate locally. The robot is the same commands on GitHub’s PC — first live run belongs next to **customer pack**, not mid-roadmap.

**Do not** treat “park robot smoke” as “park handoff / turn off WVP / give up product.” This park is **only** “don’t force GitHub Release practice today.”

---

## What stays done (no park of the files)

These stay in the repo:

- `.github/workflows/release.yml`  
- Issue templates  
- `docs/RELEASE_GUIDE.md`  
- `docker/Dockerfile`

When you later say **ship / pack** or **push packaging robot smoke**, AI + you follow the simple list below.

---

## Simple English — smoke later (when you open it)

You do **not** need to memorize this. When you ask to smoke / pack, AI can drive the git parts; you mostly click GitHub.

### You need once

- Browser logged into GitHub for repo `chinlamngncl-coder/ME8` (or whatever remote you use)  
- AI has already **pushed** the Task 3.3 files (you say push / apply push when ready)

### Steps (about 10 minutes)

1. **Ask AI:** “Push Task 3.3 packaging robot to GitHub” (if not pushed yet).  
2. Open the repo in the browser → **Releases** (right side) → **Draft a new release**.  
3. **Choose a tag** — type something safe like `v0.0.0-robot-smoke` (test only, not for a customer).  
4. Title: `Packaging robot smoke` — leave notes short.  
5. Click **Publish release** (not Save draft).  
6. Open **Actions** tab → open **Packaging Robot** → wait for green check.  
7. Back to **Releases** → open that release → confirm **three files** to download (protected zip, docker-stack zip, docker `.tar.gz`).  
8. Tell AI: **PASS** or paste a red error from Actions.

**PASS** = green Actions + three assets visible.  
**FAIL** = red Actions → AI reads the log and fixes (you don’t debug YAML).

Optional later: set GitHub variable `PUSH_DOCKER_TO_GHCR=true` only if you want images on GitHub’s container registry. Default is **zip + tar on the Release only** — enough for customers.

---

## What you do **not** need for this smoke

- BWC / cameras online  
- License HWID for a customer  
- Understanding Docker internals  
- Running commands on GitHub’s servers yourself  

---

## Phase 3 pointer

| Task | Status after this disc |
|------|-------------------------|
| 3.1 License | PASS |
| 3.2 Local `build:ship` | PASS |
| 3.3 Packaging Robot + templates | **Code landed; GitHub live smoke PARKED until ship/pack** |
| 3.4 Grey-out / entitlements (when you Execute) | Next product item when you open it |

---

## Explicit non-goals

- Do not publish a **customer** tag until product pack time.  
- Do not put private license keys in GitHub Releases or issues.  
- Do not require designer to learn `git tag` by hand — AI handles git when you say push / smoke.

---

## Lock phrase

**PARK: Packaging Robot GitHub Actions smoke until operator says ship / pack / “smoke packaging robot”.**
