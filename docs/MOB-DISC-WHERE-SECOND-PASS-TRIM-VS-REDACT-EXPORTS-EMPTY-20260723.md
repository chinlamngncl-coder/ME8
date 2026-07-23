# MOB DISC — Where are Second pass / Clear? · Redacted exports = 0

**Date:** 2026-07-23  
**Status:** PAPER — map + diagnosis; **no code** until named `MOB-APPLY`  
**Operator:** Still only **Download** on the two “old” Prior rows (Super admin). **Redacted exports** tab = **All time** + **Finalized** → **0 export(s)**. Asks **where** the other buttons are.  
**Related APPLYs:** `PRIOR-FINALIZED-SUPERADMIN-ACTIONS-V1` (actions for **redact** rows) — not broken for these two files.

---

## Short answer

| Screen | What you have | Why |
|--------|----------------|-----|
| Clip → **Prior exports** (two `_trim_…mp4` rows) | **Download only** | Those two are **Trim** copies, not **Redacted** copies |
| **Redacted exports** tab (0) | Correct empty | That tab lists only **redact** + Finalized — not trims |

**Second pass / Remove finalized / Clear finalized** live only on **[Redacted] Finalized** rows — not on trim rows.

---

## Where to look (map)

```
Evidence & Docking
├── Evidence Library → open a source clip
│     └── Prior exports
│           ├── [Redacted] + Finalized  →  Download · Second pass · Remove
│           │         (+ Clear finalized (N) on the section if 2+ redacts)
│           └── trim_….mp4 (no [Redacted])  →  Download only   ← your two rows
│
└── Redacted exports (top tab)
      └── Search across Finalized *redacted* copies only
            → empty if you never finalized a redact (or they were cleared)
```

**How to know a row is redacted:** name usually has `_redacted_`, and the UI shows **`[Redacted]`** plus a **Finalized** (or draft) status.  
**Your two files:** `…_trim_54caa3.mp4` / `…_trim_e8ed8b.mp4` → **trim** exports from the trim tool, not redact Finalize.

---

## Why the last Super-admin APPLY did not “fix” these two

`PRIOR-FINALIZED-SUPERADMIN-ACTIONS-V1` only adds Second pass / Remove / Clear for `exportType === 'redact'`.

Trim rows were never in that gate. Showing only Download on trim is **current design**, not a failed Super admin detect for these filenames.

---

## Why Redacted exports = 0 while Prior shows 2

| List | Includes |
|------|----------|
| Prior exports on a clip | Trim **and** redact (and other export types) for **that** file |
| Redacted exports tab | Registry rows with `export_type = redact` (+ your Finalized / period filters) |

So: **2 trims on one clip** ≠ **2 redacted exports in the global browser**.  
All time + Finalized + 0 means: no Finalized **redact** rows in the DB (never finalized, cleared with password, or only trims exist).

---

## What you can do **now** (no APPLY)

1. **Need the files:** Download the two trims — that is their job.  
2. **Need Second pass / more blur:** Open **Redact** on the **source** clip (top actions), Save → Finalize → then that new row (with **[Redacted]**) gets Second pass. You cannot Second-pass a trim file today.  
3. **Need to delete the two old trims:** Today there is **no** Remove on trim rows in Prior exports — only Download. (Optional APPLY below if you want that.)  
4. **Confirm redact exists:** After a real Finalize, Prior should show a **`[Redacted]`** line; Redacted exports tab should list it (All time).

---

## Optional APPLY options (pick later)

| Opt | MOB name (draft) | Does |
|-----|------------------|------|
| **A** | `PRIOR-TRIM-LABEL-AND-REMOVE-V1` | Label trim rows **[Trim]**; Super admin **Remove** (password); stop calling trim time “Burned” (use “Created”) |
| **B** | `REDACTED-EXPORTS-EMPTY-HINT-V1` | When tab is 0: hint *“0 redacted Finalized — trim copies stay on each clip’s Prior exports”* |
| **C** | Leave as-is | Trim = Download only; Redacted tab = redacts only — document only (this disc) |

**Agent recommendation:** **A + B** next if trim clutter and empty-tab confusion keep biting; else **C** if you only needed the map.

---

## One line

**Those two are trim downloads (Download only); Second pass / Clear are on [Redacted] Finalized rows; Redacted exports = 0 because it does not list trims.**
