# MOB DISC — FR genre: test · commit · push · 100% baseline lock

**Status:** APPLIED 2026-07-11 — commit `3c865d9`, tag `me8-fr-genre-20260711`, VERIFY **2519/2519**  
**Date:** 2026-07-10  
**Genre:** FR stack — snap full-face, half-face strict, standby PTT, ledger, alerts, HQ bar  
**Repo:** `github.com/chinlamngncl-coder/ubitron-lab-8wc` · tree `ME8`

---

## Gate

All must PASS before commit/push/lock:

| # | Check |
|---|--------|
| 1 | `RESTART-FLEET.bat` + hard refresh (sidecar restarted) |
| 2 | FR watch → snapshot rail = **portraits only**, no half-face / no shoulders |
| 3 | FR hit → Ack; **Standby PTT team** if you tested it |
| 4 | Live stop · SOS ack · no SOS bleed from FR |
| 5 | `.\VERIFY-ME8-POC-DEMO.ps1` → **VERIFY OK** (100% file count) **before** CREATE |

If any FAIL → fix one MOB, re-test. **No commit on FAIL.**

---

## Order (locked)

```
1. Operator: genre PASS
2. Git commit + push
3. CREATE baseline snapshot
4. VERIFY again (must match CREATE count)
5. Update BASELINE-ME8-POC-DEMO.md
```

**Never** push without VERIFY OK. **Never** CREATE before commit (snapshot should match pushed HEAD).

---

## 1) Git commit + push

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
git status
git add server.js public/js/fr-alarm.js public/index.html public/locales/en.json fr-sidecar/app.py lib/frLivePoller.js lib/frSnapLedger.js lib/frFieldAlert.js docs/MOB-DISC-*.md
# add any other FR-genre files git status shows — not .env, not storage/secrets/
git commit -m "lab-fr-genre: full-face snap, standby PTT, ledger, alerts"
git push -u origin HEAD
```

Or tell agent: **`MOB-APPLY lab-git-push-fr`**

**Never commit:** `.env`, `storage/secrets/`, customer DB dumps.

**Include:** `fr-sidecar/app.py` (not in old baseline manifest — git is source of truth for sidecar).

---

## 2) Baseline lock (100%)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\CREATE-ME8-POC-DEMO.ps1
.\VERIFY-ME8-POC-DEMO.ps1
```

**PASS =** `VERIFY OK` + `N/N` files — **no missing, no excuses**.

If VERIFY fails → fix missing paths or re-run CREATE from clean tree; do not ship a partial lock.

---

## 3) Update baseline doc

Edit `BASELINE-ME8-POC-DEMO.md`:

- New **Locked** date (2026-07-10 or test day)
- New **Files:** count from VERIFY output
- **Git HEAD** at lock (`git rev-parse --short HEAD`)
- One-line note: FR genre (full-face snap, standby PTT, …)

---

## 4) Rollback ladder (unchanged)

| Layer | Command |
|-------|---------|
| Baseline | `RUN RESTORE-ME8-POC-DEMO` (you type) |
| Git | `git checkout <prior-commit>` |
| Firmware Gold | `RESTORE-ME8-FIRMWARE-GOLD.ps1` — live/pin floor only |

---

## AI rules

- **Do not** commit/push/CREATE unless user says `lab-git-push-fr` or explicitly asks after PASS.
- **Do not** skip VERIFY because “sidecar is separate” — VERIFY must be 100% for the lock you claim.
- One commit message per genre is fine.

---

## Known gap (honest)

`CREATE-ME8-POC-DEMO.ps1` manifest may **not** list `fr-sidecar/` yet. Git push covers sidecar; extend CREATE script in a **future** MOB if you want sidecar inside baseline VERIFY count. Until then: **git + VERIFY on listed files = ship gate.**
