# MOB DISC — Trim delete · how Second pass works · where did Finalized redacts go?

**Date:** 2026-07-23  
**Status:** APPLIED 2026-07-23 — trim Remove via `MOB-APPLY PRIOR-TRIM-LABEL-AND-REMOVE-V1`  
**See:** `docs/MOB-APPLIED-PRIOR-TRIM-LABEL-AND-REMOVE-V1-20260723.md`  
**Operator:** (1) Trims should be deletable — don’t keep forever if already downloaded. (2) How do I Second pass if I only see Download? (3) Finalized tons in testing — none on Redacted exports — **check**.

---

## Part A — Trim delete (your call is right)

**Yes — there should be a Delete/Remove on trim rows for Super admin.**  
Keeping trim copies forever on the server after you already downloaded is lab clutter, not custody of the original recording.

| Fact | Detail |
|------|--------|
| Original clip | Stays in Evidence Library until you archive/delete evidence itself |
| Trim row | Extra cut on disk + registry — optional |
| Keep a copy | **Download** first, then **Remove** on the server |
| Today | Trim = **Download only** (gap) |

### Recommended APPLY (Package A, sharpened)

`MOB-APPLY PRIOR-TRIM-LABEL-AND-REMOVE-V1`

| Change | Detail |
|--------|--------|
| Label | **`[Trim]`** on Prior rows (so they are not mistaken for redacts) |
| Time label | **Created …** not “Burned …” (Burned is for redact finalize) |
| Remove | Super admin **Remove** on each trim → confirm → **password** (same family as Finalized redact clear) |
| Optional bulk | **Clear trims (N)** when 2+ on that clip (same password) |
| Original | Never deleted by trim Remove |

**Agent verdict:** Do not leave trims forever with no delete. Your “download then delete server copy” rule is the right ship pattern.

---

## Part B — How Second pass works (teach, plain)

Second pass is **not** on the Download button and **not** on trim rows.

### What Second pass needs

A Prior exports row that is a **redacted** copy:

- File name usually has `_redacted_`
- UI shows **`[Redacted]`** and **Finalized** (or draft)
- Then buttons: **Download · Second pass · Remove**

### Step-by-step (first redacted file → second pass)

1. Evidence Library → open the **source** recording (not a trim).  
2. Click **Redact** (top of detail).  
3. Draw blur → **Save redacted copy**.  
4. Fill note → **Finalize & register**.  
5. You should land on **Done** (Download) or see Prior exports with a **`[Redacted]`** line.  
6. On that **`[Redacted]`** row → **Second pass** → blur leftovers → Save → new Finalized file (old one still downloadable until you Remove it).

### Why you only see Download today

Your two Prior rows are **trims** (`…_trim_….mp4`).  
Trim = cut length. Redact = blur faces. Different tools.  
**No Second pass on trim** — by design until someone invents “redact a trim file” (not current product).

---

## Part C — Lab check: where did “tons of Finalized” go?

**Checked live catalog DB** (`FM_CATALOG_DB_URL` / `evidence_exports`) on 2026-07-23:

| Kind | Count |
|------|------:|
| `trim` | **2** (exactly your two files) |
| `redact` (any status) | **0** |
| `redact` + Finalized | **0** |

So **Redacted exports = 0** is not a filter bug and not “Super admin can’t see them.”  
The registry **has no redacted export rows at all** right now — only those two trims.

### What that means

| Possibility | Likelihood |
|-------------|------------|
| Finalize never left a **redact** row in *this* catalog (burn failed / never registered / wrong server) | Possible |
| Finalized redacts were **cleared** (Clear finalized / Remove) during testing | Possible |
| Lab **restore / DB wipe / different catalog** after testing — trims survived or were re-made | Possible |
| UI “Finalize” dead circle made it *feel* Finalized while nothing was stored as redact | Possible (we fixed that loop separately) |
| Files still on disk as orphans with no DB row | Possible — separate orphan check APPLY if you want |

**Not true:** “They’re Finalized but the Redacted exports tab hides them.” With current DB, there is nothing to hide.

### What you can do now

1. Make **one** new redacted Finalized (steps in Part B).  
2. Confirm Prior shows **`[Redacted]`** and Redacted exports tab shows **1**.  
3. If that works, old “tons” were lost from this catalog earlier — not recoverable from the empty table.  
4. If Save/Finalize still leaves 0 redact rows → say FAIL with that clip id — next is a burn/register bug APPLY.

---

## APPLY order (when you want code)

1. **`MOB-APPLY PRIOR-TRIM-LABEL-AND-REMOVE-V1`** — label + delete trims (password).  
2. Optional: `REDACTED-EXPORTS-EMPTY-HINT-V1` — empty tab says “0 redacted; trims live on clip Prior exports.”  
3. Only if a new Finalize still writes 0 rows → diagnose burn path (new MOB).

---

## One line

**Yes — trim needs Remove after Download; Second pass only on [Redacted] rows after a real Finalize; lab DB currently has 0 redacts and 2 trims — so the empty tab matches the database.**
