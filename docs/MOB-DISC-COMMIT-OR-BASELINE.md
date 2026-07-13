# MOB DISC — Commit / push now, or new version? (discussion only)

**Status:** OPEN — **no commit, no push, no baseline** until you say go-ahead  
**Date:** 2026-07-13  
**Search:** commit, push, baseline, new version, genre  
**Tree:** `Desktop\Enterprise Mobility\ME8` · branch `main`

---

## Plain answer

| Choice | Meaning | When |
|--------|---------|------|
| **A. Commit + push now** | Save current ME8 work to GitHub as one (or few) genre commits | You are happy with what you tested |
| **B. New baseline / version** | Snapshot folder (Firmware Gold / POC style) for restore | You want a **restore point** stronger than git alone |
| **C. Wait** | Keep working; commit later | More MOBs or more smoke first |

**You choose.** Agent does **not** commit until you say e.g. `MOB-APPLY lab-git-push-…` or **go ahead commit**.

---

## What git looks like now (honest)

- Branch: **`main`** (tracks `origin/main`)  
- Last commit: display / FR genre work  
- Working tree: **many** changed + new files — not only yesterday’s “lab hygiene” list  
  - Includes: start-safe, health, Alerts, login/rules discs, service bats, ship scripts, **and** lots of other docs / some FR / docker / etc.

So: **one giant dump commit is risky** — hard to read, hard to roll back one topic.

---

## Recommendation (discussion)

**Prefer A in slices — not one monster commit — and not a full new Gold yet.**

1. **First:** Commit + push a clear genre, e.g. **lab-ops-hygiene** (only files we meant for this week’s ops/UI hygiene: start-safe, LAB bat, health plain, Alerts copy, login Axiom fix, no-172 helper, rules discs).  
2. **Do not** invent a new Firmware Gold until that genre is stable and you asked for a baseline.  
3. **Leave** unrelated FR/ZLM/doc noise for a later genre or discard if accidental.

**New version / Gold (B)** = after you say the lab is good enough to restore to — heavier than a normal push.

**Wait (C)** = fine if Test 2 week is hot and you don’t want git churn yet — but then you have **no remote backup** of this week’s fixes.

---

## What I need from you

Reply with one:

| You say | Agent does (only then) |
|---------|-------------------------|
| `go ahead commit lab-ops-hygiene` | Stage **only** that genre’s files → commit → show status (**no push** until you say push) |
| `MOB-APPLY lab-git-push-lab-ops` | Commit genre + push to GitHub (your usual rule) |
| `go ahead new baseline` | Discuss name first (Gold vs POC), then you confirm CREATE script |
| `wait` | No git action |

---

## Rules reminder

- No commit without your go-ahead  
- No `.env` / secrets in git  
- Genre push style (batch by topic), not every tiny MOB  

---

## Record

| Item | Result |
|------|--------|
| Discussion | This disc |
| Action | **None until you pick A / B / C** |
