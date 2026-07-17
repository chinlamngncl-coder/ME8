# MOB DISC — Wrappers vs MANIFEST vs full snapshot · what to put on GitHub

**Date:** 2026-07-18  
**Status:** DISC — paper only — **no commit / push yet**  
**Ask:** What are wrappers and MANIFEST? I just want today’s work set up so restore is **100% back working**. What do you think we should put on GitHub? Snapshot has `.env` — keep local?

**Search:** `classic-PASS restore`, `wrappers`, `MANIFEST`, `HASHES`, `100% restore`

---

## Short answer (recommendation)

| Goal | Do this |
|------|---------|
| **100% restore on this PC** | Already done — full pack on disk + `ME8-BACKUPS` (includes `.env`) |
| **GitHub keep (safe)** | Commit **wrappers + BASELINE doc + MANIFEST + HASHES + scripts inside baseline folder** — **never** commit snapshot `.env` / secrets |
| **100% restore on another PC from GitHub alone?** | **No** — GitHub without `.env` / local storage can’t be bit-identical lab; you still need this PC’s backup folder or a private copy of `.env` |

**Think:**  
- Disk backup = **full** restore (your “100%”).  
- GitHub = **recipe + proof hashes + code wrappers** so you don’t lose *how* to restore, and code history stays.  
- Do **not** push `.env` to public GitHub.

---

## What each piece is (plain)

### 1) Full snapshot (the real backup)

Folder: `baseline/2026-07-18-classic-pass/`  
(+ mirror `ME8-BACKUPS/2026-07-18-classic-pass/`)

Copies of **~2510 files** from today’s live tree: `server.js`, `public/js/*`, `lib/*`, `index.html`, `call-mic.js`, docs, storage configs, **and `.env`**.

This is what makes restore **feel like today** on this machine.

### 2) Wrappers (small scripts at repo root)

| File | Job |
|------|-----|
| `CREATE-ME8-CLASSIC-PASS-20260718.ps1` | Builds / refreshes the snapshot folder |
| `RESTORE-ME8-CLASSIC-PASS-20260718.ps1` | Copies snapshot **back** into live ME8 |
| `VERIFY-ME8-CLASSIC-PASS-20260718.ps1` | Checks live files still match snapshot hashes |
| `BASELINE-ME8-CLASSIC-PASS-20260718.md` | Human instructions + restore phrase |

Wrappers are **not** the backup. They are the **buttons** that run CREATE / RESTORE / VERIFY. Same pattern as Firmware Gold / Pre-Gate-C.

### 3) MANIFEST.json

Inside the snapshot folder. A **table of contents**:

- Version name (`me8-classic-pass-20260718`)  
- Git commit at CREATE (`4952284`)  
- Note: Soft Open off, classic PASS  
- List of every file path that was locked  
- Which files are “frozen” cores (wall, call-mic, pool, …)

RESTORE reads MANIFEST and copies each listed file back.

### 4) HASHES.json

SHA256 of each locked file. VERIFY compares live vs snapshot so you know nothing drifted.

---

## How restore works (your 100%)

You type (operator only):

```
RUN RESTORE-ME8-CLASSIC-PASS-20260718
```

Agent/operator runs:

```powershell
.\RESTORE-ME8-CLASSIC-PASS-20260718.ps1
.\RESTART-FLEET.bat
```

Hard refresh dashboard.

That pulls from the **full snapshot on disk** (or ME8-BACKUPS if you point RESTORE there). That is the **100% back working** path on this lab PC.

---

## What is already safe today

| Keep | Status |
|------|--------|
| GitHub classic code genre | Done — `81c8929` / `4952284` |
| Full classic-PASS snapshot on this PC | Done — 2510 files, VERIFY OK |
| ME8-BACKUPS mirror | Done |
| `.env` on GitHub | **Must stay off** (`.gitignore`) |

So you are **not** unprotected. Disk + GitHub code already cover “don’t lose today’s work” for this machine.

---

## What I think you should commit next (when you say push)

**Yes — commit these (safe, useful):**

- Root wrappers + `BASELINE-ME8-CLASSIC-PASS-20260718.md`  
- `baseline/2026-07-18-classic-pass/CREATE-*.ps1` / `RESTORE-*.ps1` / `VERIFY-*.ps1`  
- `MANIFEST.json` + `HASHES.json`  
- `docs/MOB-APPLIED-CREATE-BASELINE-CLASSIC-PASS-20260718.md`  
- Update `.gitignore` allowlist for classic-PASS scripts (like Gold)

**No — do not commit:**

- Snapshot copy of `.env`  
- `storage/secrets/`  
- Whole GIS tile dump if huge (optional; already partly in git elsewhere)  
- Nested Seeta vendor trees

**Optional private keep (not public GitHub):** zip `ME8-BACKUPS/2026-07-18-classic-pass` to an external drive / private share for disaster recovery off this PC.

---

## Honest “100%” limit

| Scenario | Enough? |
|----------|---------|
| This PC, Soft Open broke ops again | **Yes** — `RUN RESTORE-ME8-CLASSIC-PASS-20260718` |
| New PC, only public GitHub clone | Code + wrappers yes; lab `.env` / license / DB **no** unless you copy ME8-BACKUPS privately |
| Want WVP experiments tomorrow | Keep this floor; restore if WVP hurts |

---

## Lock

- Wrappers = run buttons. MANIFEST/HASHES = inventory + proof. Snapshot folder = the real backup.  
- Your 100% restore = **disk snapshot** (already created).  
- GitHub next = wrappers + MANIFEST/HASHES + docs — **not** `.env`.  
- Say **`MOB-APPLY lab-git-push-classic-pass-baseline-wrappers`** when you want that commit/push.

**One line:** Wrappers are the restore buttons; MANIFEST is the file list; full 100% is the on-disk pack (already done) — push wrappers+MANIFEST to GitHub, keep `.env` local.
