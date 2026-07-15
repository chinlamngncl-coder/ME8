# MOB DISC — Commit & push this FR wave? (not now)

**Status:** DISC only — **no commit / no push**  
**Date:** 2026-07-13  
**Trigger:** “Nice. Commit and push? Mob disc” after offline Play PASS + FR map/holds wave  
**Search:** lab-git-push, FR genre, commit batch, ME8 origin  
**Repo:** `github.com/chinlamngncl-coder/ME8` (`main`)  
**Rule:** Lab batches by **genre**; push only on explicit `MOB-APPLY lab-git-push-<genre>` (or clear “commit and push this genre”).  

---

## Short answer

| Question | Answer |
|----------|--------|
| Commit & push **right now**, whole dirty tree? | **No** — tree mixes FR + ZLM + docs + service + unrelated edits |
| Is this FR wave **worth a genre commit** soon? | **Yes** — after you name the genre and confirm scope |
| Blocked on match/migration? | **No for this wave** — snaps/Play/holds/map UX are shippable history; **re-enroll is a later genre** |

**One line:** Celebrate the wave; **don’t** dump the entire working tree. Batch a **named FR genre**, then you say push.

---

## What this wave actually is (genre candidates)

Pick **one** commit name when ready (examples):

### A — `lab-fr-investigation-ux` (recommended first push)

| APPLIED pieces | Include? |
|----------------|----------|
| Keep → `fr-kept` + Investigation holds UI | Yes |
| Map: keep-require-crop, floating tag, side-dock Expand | Yes |
| Grab warm-gate (snapshot stable) | Yes |
| Offline crop **Play from here** | Yes |
| Related DISCs for those | Yes (optional but useful) |

**Do not mix in:** gallery re-enroll, engine cutover, holds disposition/delete, map restore-view, voice-hint probe quiet.

### B — `lab-fr-engine-onnx` (separate later)

ONNX lab enable, sidecar-fast, bench, health card — only if not already pushed; **re-enroll still after**.

### C — Everything dirty on disk

**Reject.** Hundreds of files / many genres → hard rollback, noisy PR, risk of secrets (never `.env`).

---

## Restart vs commit (habit)

| Change type | Need restart? | Need commit? |
|-------------|---------------|--------------|
| Server (`frLiveProbe`, `frOfflineVideo`, `server.js`) | **Yes** once | When genre PASS |
| Browser (`index.html`, `fr-alarm.js`) | Hard refresh | When genre PASS |
| `.env` lab flags | Restart | **Never commit secrets** (`.env.example` only) |

You do **not** restart for every MOB — only when server/env changes.

---

## Suggested commit message (when you order push)

```text
lab-fr-investigation-ux: holds, map FR pin/expand, grab warm-gate, offline play-at

Keep packs + Evidence Investigation holds; map tag/side-dock Expand;
stable still-grab warm-gate; offline Play from any crop (not hit-only).
```

Push command habit (you say it):

`MOB-APPLY lab-git-push-fr-investigation-ux`

Then agent: scoped add → one commit → `git push -u origin HEAD` (no force; no `.env`).

---

## Still open (do **not** pretend done in that commit)

| Item | Status |
|------|--------|
| Gallery re-enroll / match honesty | **Not done** |
| Engine cutover (ship default onnx) | Not done |
| Hold disposition (Clear/Close) | DISC only |
| Map close restore view | Parked (video risk) |
| Pic → vault video search | DISC only |

---

## Verdict

**Nice wave — yes, worth committing soon as genre A.**  
**Not tonight unless you say the push MOB.**  
**Not the whole repo dirty list.**

Reply e.g. **`MOB-APPLY lab-git-push-fr-investigation-ux`** when ready (optionally list exact paths to include).
