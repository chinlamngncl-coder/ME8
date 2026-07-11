# MOB DISC — Snap rail 16-fit · commit · push · 100% baseline restore

**Status:** DISC only — **2026-07-11**  
**Trigger:** Operator PASS on `mob-fr-snap-rail-16-fit` — commit/push must include a **full restore floor**, not git-only  
**Search:** snap rail commit, baseline lock, restore, VERIFY, lab-git-push  
**Related:** `MOB-DISC-FR-SNAP-RAIL-16-NO-SCROLL.md` (APPLIED), `MOB-DISC-FR-GENRE-COMMIT-PUSH-BASELINE.md`, `BASELINE-ME8-POC-DEMO.md`

---

## Verdict — git push alone is not enough

| Layer | Restores what | Enough for snap-rail rollback? |
|-------|----------------|--------------------------------|
| **Git checkout** | Code at commit | Partial — no guarantee tree matches tested bytes; storage unchanged |
| **`RESTORE-ME8-POC-DEMO` + VERIFY** | **100%** snapshotted files + site config | **Yes — ship gate** |

**Locked:** After this genre push, run **CREATE → VERIFY → update `BASELINE-ME8-POC-DEMO.md`** so `RUN RESTORE-ME8-POC-DEMO` returns to **exactly** this PASS.

---

## What PASS locked (2026-07-11)

| MOB | Delivers |
|-----|----------|
| **`mob-fr-snap-rail-16-fit`** | 16 slots fill column · **no scroll** · title **Recent** · no “Snaps appear while watch…” |

**Files touched:**

- `public/index.html` — rail CSS, `fr-alarm.js?v=20260711-snap-rail-16-fit`
- `public/js/fr-alarm.js` — hint removed, `snapshotRecent`
- `public/locales/en.json` — `snapshotRecent`; `cropEmpty` removed
- `docs/MOB-DISC-FR-SNAP-RAIL-16-NO-SCROLL.md` — APPLIED

**Prior git floor (still valid rollback):** `860945e` — `lab-fr-alert-ui-1b` (alert drawer/toast, lab preview gate, 6-tile watch).

---

## Order (locked — do not skip steps)

```
1. Operator: snap-rail PASS          ← done
2. Git commit + push                 ← lab-git-push-fr-snap-rail-16-fit
3. Git tag (optional but recommended)
4. CREATE-ME8-POC-DEMO.ps1           ← new baseline bytes
5. VERIFY-ME8-POC-DEMO.ps1           ← must be N/N, no missing
6. Update BASELINE-ME8-POC-DEMO.md   ← date, count, HEAD, tag, cache-bust note
7. Commit baseline doc + snapshot    ← second commit OR same push wave (see below)
```

### Two-commit pattern (recommended)

| Commit | Contents |
|--------|----------|
| **A** | App code + DISC (`lab-fr-snap-rail-16-fit: …`) |
| **B** | `baseline/2026-07-09-me8-poc-demo/` snapshot delta + `BASELINE-ME8-POC-DEMO.md` |

**Why two:** CREATE runs **after** A is committed so snapshot matches pushed HEAD. Tag **after** B if baseline is in repo.

**Single push OK:** push A, CREATE, VERIFY, commit B, push B — both on `main`.

---

## Gate before commit

| # | Check |
|---|--------|
| 1 | Hard refresh — snap column **16 slots**, **no scrollbar**, label **Recent** |
| 2 | Click thumb → lightbox OK |
| 3 | Real match → red rail border OK |
| 4 | VC · PTT · SOS · one live · stop — no regression |
| 5 | `RESTART-FLEET.bat` once if server was not restarted since MOB |

---

## 1) Git commit + push (genre slice)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
git status
git add public/index.html public/js/fr-alarm.js public/locales/en.json `
  docs/MOB-DISC-FR-SNAP-RAIL-16-NO-SCROLL.md docs/MOB-DISC-FR-SNAP-RAIL-COMMIT-PUSH-RESTORE.md
git commit -m "lab-fr-snap-rail-16-fit: 16-slot rail no scroll, Recent label, trim dev copy"
git push origin HEAD
```

Or tell agent: **`MOB-APPLY lab-git-push-fr-snap-rail-16-fit`**

**Never commit:** `.env`, `storage/secrets/`, watchlist blobs, customer DB dumps.

---

## 2) Git tag (rollback pointer)

```powershell
git tag -a me8-snap-rail-16-fit-20260711 -m "PASS: snap rail 16 fit no scroll"
git push origin me8-snap-rail-16-fit-20260711
```

---

## 3) Baseline lock (100% restore)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\CREATE-ME8-POC-DEMO.ps1
.\VERIFY-ME8-POC-DEMO.ps1
```

**PASS =** `VERIFY OK` + **N/N** — **no missing, no excuses**.

If VERIFY fails → fix manifest / re-run CREATE from clean tree. **Do not claim full restore on FAIL.**

---

## 4) Update `BASELINE-ME8-POC-DEMO.md`

| Field | Example |
|-------|---------|
| **Version** | `me8-poc-demo-20260711-snap-rail-16-fit` |
| **Locked** | 2026-07-11 — snap rail 16-fit (no scroll, Recent label) on top of alert-ui-1b |
| **Files** | count from VERIFY (may differ from 2519 if DISCs added) |
| **Git HEAD at lock** | `git rev-parse --short HEAD` after baseline commit |
| **Git tag** | `me8-snap-rail-16-fit-20260711` |
| **Cache bust** | `fr-alarm.js?v=20260711-snap-rail-16-fit` |

Then commit + push baseline folder + doc (commit B above).

---

## Rollback ladder (full restore)

| Need | Command |
|------|---------|
| **100% restore to this lock** | You type **`RUN RESTORE-ME8-POC-DEMO`** → `.\RESTORE-ME8-POC-DEMO.ps1` → `.\RESTART-FLEET.bat` |
| **Confirm tree** | `.\VERIFY-ME8-POC-DEMO.ps1` → VERIFY OK + N/N |
| **Code-only (no storage)** | `git checkout me8-snap-rail-16-fit-20260711` or prior `860945e` (alert-ui-1b only) |
| **Before alert UI wave** | `git checkout 49891d4` (POC demo lock) |
| **Live/pin floor only** | `RESTORE-ME8-FIRMWARE-GOLD.ps1` — loses FR genre |

**AI rule:** RESTORE only when user types **`RUN RESTORE-ME8-POC-DEMO`**.

---

## What baseline restores vs git

| Restored by POC/Demo baseline | Not in snapshot (by design) |
|------------------------------|-----------------------------|
| `server.js`, `public/**`, `lib/fr*.js`, analytics UI | `node_modules/` |
| `storage/` site config pattern (devices, settings, users) | `storage/secrets/` |
| `fr-sidecar/` if in manifest | `storage/fr-blacklist/` (watchlist photos) |
| Locked cache-bust lines in `index.html` | `storage/fr-snap-ledger/` (crop archive) |
| | `fr-sidecar/.venv/` |

**Git** restores code; **baseline** restores the **tested byte snapshot** including `storage/` copies in the manifest. For “we need it back exactly as PASS,” use **RESTORE + VERIFY**.

---

## Known gaps (honest)

| Gap | Mitigation |
|-----|------------|
| `fr-sidecar/.venv` not snapshotted | Re-run `START-FR.bat` / sidecar install after restore |
| Watchlist / snap ledger data | Survives restore if on disk; not guaranteed in baseline — export if critical |
| CREATE manifest may lag new paths | Extend `CREATE-ME8-POC-DEMO.ps1` in a future MOB; until then VERIFY must pass on listed files |

---

## Apply commands

```text
MOB-APPLY lab-git-push-fr-snap-rail-16-fit
```

After agent push, **you** run CREATE + VERIFY (or authorize agent in same session):

```text
MOB-APPLY me8-baseline-relock-snap-rail-16-fit
```

(second MOB name reserved — **user runs CREATE**, not AI, per baseline ritual unless you explicitly delegate)

---

## FAQ

| Question | Answer |
|----------|--------|
| G1 already pushed — is this separate? | **Yes** — small genre slice on top of `860945e` |
| Skip baseline if git is pushed? | **No** — full restore requires CREATE + VERIFY |
| Roll back only snap rail, keep alert UI? | `git checkout 860945e` on the three public files — or restore old baseline then cherry-pick |
| Customer ship? | Snap rail is operator UI — ship pack uses separate denylist MOBs |
