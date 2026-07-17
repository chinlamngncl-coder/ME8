# MOB DISC — Pre-Gate packs vs backup · should we snapshot classic PASS first?

**Date:** 2026-07-18  
**Status:** DISC — paper only — **no backup / restore run yet**  
**Ask:** “Pre-Gate baseline packs (do you mean we do a backup?) All these classic are already stable. Shall we backup first? I do not want to lose our work.”

**Search:** `classic PASS backup`, `pre-gate pack`, `snapshot before WVP`

---

## Short answers

| Question | Answer |
|----------|--------|
| Are “Pre-Gate baseline packs” today’s classic backup? | **No.** Those are the **2026-07-14** Pre-Gate-C snapshot tools / folder — **older** than tonight’s classic PASS |
| Did we already keep classic work? | **Yes on GitHub** — `81c8929` / `4952284` on `main` (Call / BWC-stop / pin / Soft Open off genre) |
| Should we backup **again** before WVP/ZLM? | **Yes — recommended.** Make a **new** named snapshot of **classic PASS now**, not restore old Pre-Gate-C |
| Should we `RUN RESTORE-ME8-PRE-GATE-C`? | **No** — that would pull **Jul 14** tree and can **lose** newer classic / redact / Call fixes |

---

## Three different “keeps”

| Keep | What it is | Classic PASS? |
|------|------------|---------------|
| **A. GitHub `main`** | Commits — already has classic genre | **Done** (`81c8929`) |
| **B. Pre-Gate-C pack (Jul 14)** | Old baseline folder + CREATE/RESTORE scripts | **Old** — not today’s PASS |
| **C. New classic-PASS baseline (proposed)** | Fresh `CREATE-…` snapshot of **current** tree before WVP | **Not created yet** — you ask APPLY |

When the agent said Pre-Gate packs were “not in the push,” that meant: the **Jul 14 pack scripts/folder** were still untracked locally — **not** “you have no backup of classic.” Classic code is on GitHub.

---

## Why backup again if git already has it?

Git = history + remote keep (good).  
Baseline pack = **one-phrase restore** of a known-good tree (like Firmware Gold / Pre-Gate-C).

Before putting WVP/ZLM back, a **classic-PASS floor** lets you say later:

`RUN RESTORE-ME8-CLASSIC-PASS-20260718`  

…without digging git or risking Soft Open / WVP mess overwriting the stable feel.

That is **create new backup**, not restore Pre-Gate-C.

---

## Recommended order (when you say APPLY)

1. **Keep classic PASS as-is** (Soft Open / lab WVP still off) — already PASS.  
2. **Named APPLY** e.g. `MOB-APPLY create-baseline-classic-pass-20260718`  
   - CREATE script + `baseline/2026-07-18-classic-pass/` (or similar)  
   - Optional copy to `ME8-BACKUPS/…`  
   - Optional git branch/tag — only if you ask  
3. **Then** named APPLY for clean WVP/ZLM lab back.  
4. If WVP hurts ops → restore **classic-PASS** phrase (not Pre-Gate-C, not Gold unless you want older).

---

## Forbidden without your phrase

| Action | Why |
|--------|-----|
| `RUN RESTORE-ME8-PRE-GATE-C` | Jul 14 — can erase newer work |
| Blind Gold restore for “backup” | Wrong floor for tonight’s classic |
| Freestyle CREATE without MOB-APPLY | Death-sentence / zero-change rule |

---

## Lock

- Classic stable = **PASS** (`MOB-DISC-CLASSIC-FLEET-PASS-20260718.md`).  
- GitHub already holds classic genre.  
- **Yes — backup first** before WVP, as a **new classic-PASS baseline**, when you say the CREATE APPLY.  
- Pre-Gate packs ≠ that backup.

**One line:** Pre-Gate = old Jul-14 pack; classic is already on GitHub; yes create a **new** classic-PASS baseline before WVP — then restore that, not Pre-Gate-C.
