# MOB DISC — Keep Seeta redaction + FR (2 days) while fixing Soft Open live

**Date:** 2026-07-17  
**Status:** DISC — paper only — **no restore / no checkout until you APPLY**  
**Ask:** Can we keep last ~2 days Seeta redaction UI + FR (Seeta) if we undo Soft Open live mess via git?

---

## Short answer

**Yes — we can keep that work.**  
But: most of it is **not committed / not pushed**. It is only on this PC’s working tree.  
Blind “restore everything from git” or old baselines **would waste those days**. We must **not** do that.

---

## What git says (checked now)

| | Fact |
|--|------|
| Last **push** on `main` | `f104cfa` — `lab-fr-wvp-checkpoint` (FR + WVP soft-live backup — **older** than your last 2 days of Seeta redact UI polish) |
| Seeta redact / FR last 2 days | Mostly **local only** — modified + untracked — **not** on GitHub |
| Soft Open live storm | Also mostly **local only** on top of that same commit |

So: **commit/push does not protect the last 2 days of redaction/FR.** Disk does — until something overwrites it.

---

## Keep pile (do **not** checkout from git)

These hold your recent Seeta / redact / FR work (large local diffs / new folders):

**Modified (keep):**
- `public/js/evidence-hub.js` (~800 lines local)
- `lib/faceRedactRegions.js`
- `lib/faceTrackSidecar.js`
- `lib/evidenceWorkflow.js`
- `redaction-track/detect_faces.py` (Seeta detect path)
- `lib/auditActionLabels.js`
- `lib/siteDb.js` (part redact/evidence)
- locales (if they only touch evidence strings — keep unless Soft Open polluted)

**Untracked (keep — never in git yet):**
- `fr-sidecar-seeta/` (app, install, START bat, …)
- `fr-sidecar-fast/`
- `START-FACE-MATCHING.bat`
- many `docs/MOB-APPLIED-EVIDENCE-REDACT-*` / DISC redact docs

**Rule:** any live restore = **never** `git checkout` these paths.

---

## Soft Open / live pile (safe to put back from `f104cfa` **if** you APPLY)

Pure live/Soft Open files (not your Seeta UI genre):

- `public/js/video-wall.js`
- `public/js/live-player-factory.js`
- `public/js/wvp-lab-tile.js`
- `lib/livePlaybackBroker.js`
- `lib/wvpLabClient.js`
- `lib/zlmLabRelay.js` / `lib/zlmIngestLab.js` (lab live — not redact)

Checkout **only** that list → Soft Open storm off those files; **redact/FR files above stay**.

---

## Danger: **mixed** files (cannot blind-restore)

| File | Why dangerous |
|------|----------------|
| `public/index.html` | Has **both** Seeta redact workspace CSS/UI **and** Soft Open / video-wall cache / live bits |
| `server.js` | Has **both** evidence/redact/FR wiring **and** big WVP/ZLM Soft Open lab APIs |

`git checkout HEAD -- public/index.html` or `server.js` = **kills** days of redact UI / server wiring with Soft Open undo. **Forbidden** as a blind step.

How to handle later (after you APPLY a named MOB):

1. **Safety first** — freeze keep-pile to disk (copy folder or a **keep-only** commit you approve), **then**  
2. Live files only from git, **then**  
3. `index.html` / `server.js` — **surgical** (keep redact blocks; drop Soft Open blocks) or leave as-is until live is tested with Soft Open **OFF** in env only.

---

## Recommended order (no APPLY yet)

1. **Safety freeze (highest priority)** — before any live undo:  
   - either you say `MOB-APPLY safety-commit-keep-fr-redact` (commit **only** keep-pile + docs; **not** Soft Open live files), **or**  
   - agent copies keep-pile to something like `baseline/2026-07-17-keep-fr-redact/` (APPLY needed).  
   Goal: 2 days of work cannot vanish if a bad checkout happens.

2. **Then** Soft Open OFF in `.env` (no code) — see if SOS/live feel returns enough.

3. **Then** (if needed) `MOB-APPLY git-restore-live-files-only-from-f104cfa` — **only** the Soft Open pile list above — **never** evidence-hub / face* / detect_faces / fr-sidecar* / blind index+server.

4. **Later** surgical pass on `index.html` / `server.js` if live still broken and Soft Open bits are the cause.

---

## What we will **not** do

- Full Firmware Gold / Pre-Gate-C wipe  
- `git reset --hard` / restore whole tree from old baseline  
- Checkout `index.html` or `server.js` from git without a keep plan  
- Touch keep-pile while undoing Soft Open  

---

## One line

**Yes — Seeta redact UI + FR can stay; they are mostly separate files and still only on this PC — safety-freeze them first, then undo Soft Open live files only; never blind-restore `index.html` / `server.js`.**
