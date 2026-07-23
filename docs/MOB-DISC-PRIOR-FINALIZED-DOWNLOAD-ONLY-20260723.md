# MOB DISC — Prior Finalized rows: “can only Download, nothing else”

**Date:** 2026-07-23  
**Status:** SUPERSEDED 2026-07-23 — operator is Super admin; “Download-only by design for non-SA” was the wrong diagnosis for this report.  
**Correct disc:** `docs/MOB-DISC-PRIOR-FINALIZED-SUPERADMIN-ACTIONS-MISSING-20260723.md`  
**Operator:** On the two old Finalized Prior exports, UI shows **Download only** — no Second pass, no Remove, no Clear finalized.  
**Related:** Loop fix APPLIED (`REDACT-FINALIZE-DONE-NO-LOOP-V1`). This disc is about **row actions**, not the Finalize circle.

---

## What the product is supposed to show (today’s code)

| Who you are | Finalized row actions |
|-------------|------------------------|
| Export / download role (not Super admin) | **Download only** — by design |
| **Super admin** | **Download** + **Second pass** + **Remove** (+ **Clear finalized (N)** when 2+ rows) |

So “only Download” is **correct** if the signed-in account is **not** Super admin.  
If you **are** Super admin and still only see Download → that is a **display / perm-detect** problem, not “files are locked forever.”

---

## What you can do with those two old rows **right now**

| Goal | How |
|------|-----|
| Keep them | **Download** is enough — files are already Finalized custody copies |
| Blur more on one copy | Need **Second pass** → must be **Super admin** (or we APPLY to allow edit role) |
| Delete both | Need **Clear finalized (2)** + password → Super admin |
| Delete one | Need **Remove** + password → Super admin |

If you only need the files offline: **Download both** and leave them. No further action required for custody.

---

## Why Second pass / Remove might be missing

| Cause | Check |
|-------|--------|
| A | Logged in as operator / export-only — expected Download-only |
| B | Super admin flag in UI failed (`perms.superAdmin` false) — Settings → Users: role = Super admin; hard refresh |
| C | Buttons off-screen / wrapped — widen detail pane; look right of each row |
| D | Stale JS cache — hard refresh after loop-fix cache bust |

---

## Options (pick later if you want a change)

| Opt | Meaning |
|-----|---------|
| **A — Keep as designed** | Non–Super admin = Download only. Super admin gets Second pass / Remove / Clear. No APPLY. |
| **B — Show Second pass for edit role** | Anyone with evidence edit can Second pass; Remove/Clear stay Super admin. |
| **C — Always show Second pass label (disabled)** | Download + grey “Second pass (Super admin)” so operators know the path exists. |
| **D — Lab unlock** | Temporary: show all Finalized actions when `FM_…` lab flag (not for ship). |

**Agent recommendation:** **A** for ship. If you are Super admin and still only see Download after hard refresh → report that; next APPLY is a **perm/UI visibility** fix, not “add Download.”

---

## One line

**Download-only on Finalized is normal for non–Super admin; Super admin should also see Second pass / Remove / Clear — say which you need if buttons are missing.**
