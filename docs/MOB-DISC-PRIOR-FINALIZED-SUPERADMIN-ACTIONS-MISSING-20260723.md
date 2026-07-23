# MOB DISC — Super admin Prior Finalized rows: only Download (apology + fix)

**Date:** 2026-07-23  
**Status:** APPLIED 2026-07-23 — `MOB-APPLY PRIOR-FINALIZED-SUPERADMIN-ACTIONS-V1`  
**See:** `docs/MOB-APPLIED-PRIOR-FINALIZED-SUPERADMIN-ACTIONS-V1-20260723.md`  
**Operator:** Super admin. Two Finalized Prior exports show **Download only** — no **Second pass**, no **Remove**, no **Clear finalized**.  
**Tone:** Agent fault for blaming role. Product should show those actions for Super admin.

---

## Apology (plain)

You said you are Super admin. Code is supposed to show **Download + Second pass + Remove**, and **Clear finalized (2)** on the Finalized section when there are two rows. If you only see Download, that is a **bug / stale UI**, not “you lack permission.”

---

## What Super admin **should** see (locked intent)

| Place | Actions |
|-------|---------|
| Each Finalized redact row | **Download** · **Second pass** · **Remove** |
| Section “Finalized — …” when 2+ rows | **Clear finalized (N)** (password confirm) |

Second pass was APPLIED earlier (`REDACT-SECOND-PASS-ON-EXPORT-V1`). It is not optional for Super admin.

---

## Likely causes (ranked — not “you’re not admin”)

| # | Cause | Why it fits |
|---|--------|-------------|
| **1** | **Stale detail HTML after login/perms** | Detail can render (or stay warm) with `perms.superAdmin` still false; later perms flip to true but `refreshCurrentPanel()` **skips** rebuild when detail is “warm” → Download-only DOM sticks. You still pass real Super admin APIs (Finalize, etc.) because those re-check live `perms`. |
| **2** | **Narrow actions column / wrap** | Second pass + Remove render to the right of Download; easy to miss if the pane is tight (scroll/wrap). Still a UX fail if you looked carefully. |
| **3** | **Clear finalized only on section title** | Not on each row — easy to miss even when present. |
| **4** | **Stale JS cache** | Old `evidence-hub.js` without Second pass / Remove — hard refresh usually fixes; if not → #1. |

**Not the story:** “Download-only is correct for Super admin.” It is not.

---

## What to do **now** (no APPLY)

1. Hard refresh (Ctrl+F5) Evidence → reopen that clip → Prior exports.  
2. Look on the **Finalized** heading for **Clear finalized (2)**.  
3. On each row, look **right of Download** for **Second pass** / **Remove**.  
4. If still Download only → say **FAIL still download-only** — next is APPLY below (do not keep arguing role).

---

## Recommended APPLY (one path)

`MOB-APPLY PRIOR-FINALIZED-SUPERADMIN-ACTIONS-V1`

| Change | Detail |
|--------|--------|
| Force rebuild | On `applyPermissions`, if detail is open → `loadDetail(id, **true**)` so Super admin actions always reappear |
| Gate on role | Prefer `dashboardRole === 'super_admin'` (same as Storage nav) for Prior Finalized actions — not only the permission heuristic |
| Visibility | Keep **Second pass** + **Remove** + **Clear finalized** for Super admin; do not hide behind export-only |
| Layout | Stack actions under the file name if needed so Download is not the only visible control |
| Verify | Super admin + 2 Finalized → all three row actions + Clear (2) visible without hunting |

**Out of scope:** changing password confirm on Clear/Remove; Finalize dead-circle (already APPLIED).

---

## One line

**Sorry — Super admin should not be Download-only; stale Prior exports UI is the bug; next APPLY forces Super admin Second pass / Remove / Clear to show.**
