# MOB DISC — Operator cheat sheet: exact APPLY phrases (no guessing)

**Date:** 2026-07-17  
**Status:** LOCKED cheat sheet — you only copy the next line  
**Why:** Agent must not leave you guessing. Each step = one exact `MOB-APPLY …` you paste.

---

## How you always know what to do

1. Look at **NEXT** below (one line only).  
2. Paste that exact `MOB-APPLY …` in chat.  
3. Agent does **only** that step, then prints the **new NEXT**.  
4. You test if the step says TEST. Pass/fail in one word.

No long menus. No “pick a path.” Agent owns the sequence.

---

## Sequence (do in order)

| # | You paste exactly | Agent does | Then you |
|---|-------------------|------------|----------|
| **1** | `MOB-APPLY lab-git-push-safety-fr-redact` | Push commit `0dc4486` (Seeta FR/redact) to GitHub | Wait for “push OK” |
| **2** | `MOB-APPLY safety-commit-keep-ops-wvp-infra` | Commit Windows service + WVP LAN/proxy + ZLM pack (not Soft Open wall) | Wait for commit hash |
| **3** | `MOB-APPLY lab-git-push-ops-wvp-infra` | Push that commit | Wait for “push OK” |
| **4** | `MOB-APPLY softopen-off-normal-fleet` | Soft Open / WVP-only lab flags **off** (env / settings only — no Soft Open UI rewrite) | **TEST:** live, SOS, PTT, wall, redact once → say PASS or FAIL |
| **5** | `MOB-APPLY git-restore-softopen-storm-files-only` | Checkout **only** Soft Open storm files from git HEAD (wall/player/broker dirty pile). **Never** wipe redact. **Never** old Gold. | **TEST:** same checklist → PASS/FAIL |
| **6** | (only if step 4–5 PASS) later | Clean WVP/ZLM back — **new** named APPLY when we get there | Soak + SOS/PTT check |

**If FAIL at 4 or 5:** stop. Tell agent FAIL + what broke. Do **not** jump to WVP/ZLM.

**Forbidden without your paste:** freestyle restore, Gold wipe, Soft Open UI patches, bundling two steps.

---

## RIGHT NOW

After step **1** push succeeds → **NEXT = step 2:**

```text
MOB-APPLY safety-commit-keep-ops-wvp-infra
```

---

## One line

**You only ever paste the NEXT `MOB-APPLY …` line; agent runs that one step and tells you the next phrase.**
