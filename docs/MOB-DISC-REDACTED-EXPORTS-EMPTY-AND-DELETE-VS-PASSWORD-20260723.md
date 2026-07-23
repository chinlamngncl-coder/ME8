# MOB DISC — Redacted exports empty · DELETE type-confirm vs password

**Date:** 2026-07-23  
**Status:** APPLIED 2026-07-23 — `MOB-APPLY REDACT-CLEAR-FINALIZED-PASSWORD-CONFIRM-V1`  
**See:** `docs/MOB-APPLIED-REDACT-CLEAR-FINALIZED-PASSWORD-CONFIRM-V1-20260723.md`  
**Operator:** Redacted exports shows **0** / “No redacted exports match these filters” even after finalizing many; asks if delete caused it; hates **type DELETE** (all caps) — wants **confirm password** so the deleter is responsible  
**Genre:** Evidence redact library + cleanup UX / custody (not face blur quality)

---

## Part A — Why the list can be empty (even if you finalized a lot)

Your screenshot filters are strict:

| Filter | Your setting | Effect |
|--------|--------------|--------|
| **Period** | **This week** | Only exports with burn/finalize time in the **last 7 days** |
| **Status** | **Finalized** | Hides drafts / note-pending |

So “I finalized a lot” can still show **0** if:

1. **Those finals are older than 7 days** → change Period to **All time** (or 4 weeks / month) and Refresh.  
2. **You cleared them** with **Clear finalized** on the clip’s Prior exports (typed DELETE) → those copies are **gone from disk + registry** for that clip. Original evidence stays; the **redacted downloads** do not.  
3. **Single-row Remove** on a Finalized Prior export → that one file gone.  
4. **Wrong status** (unlikely if you chose Finalized) — drafts never appear under Finalized.  
5. **Different place:** Prior exports on **one clip’s detail** still lists that clip’s redacts; the **Redacted exports** tab is a **global search** with period/status filters — empty tab ≠ empty Prior exports on every clip.

**Straight check (no APPLY):**

1. Period → **All time** · Status → **Finalized** · Refresh.  
2. If still 0: open a clip you know you finalized → **Prior exports**.  
   - Rows there → tab was filter/time; not “everything deleted.”  
   - No Finalized rows there → those copies were removed (Clear finalized / Remove) or never finalized on that clip.

**Hint on the tab** (“Find finalized… Download here”) is about **where** to look — it does **not** mean Clear finalized is safe or reversible.

---

## Part B — “Type DELETE” vs confirm password (you’re right on accountability)

### What exists today

**Clear finalized (bulk)** on one clip asks you to type **`DELETE`** (all caps).  
Server checks the string matches. Anyone who is already **Super admin** and can open that prompt can clear — the word does **not** prove *who* typed it beyond the session already logged in.

### Your point

| Claim | Truth |
|-------|--------|
| Typing DELETE proves identity | **No** — anyone at an unlocked Super admin desk can type it |
| Password re-confirm binds the act to that account | **Yes** — same pattern as secure-export approve (admin password) |
| Custody / audit should record who destroyed Finalized copies | **Yes** — we already have session user; password check raises the bar against casual click + shoulder-surfing “just type DELETE” |

**Agent verdict:** Your instinct is **better** for destructive Finalized cleanup than the DELETE word.  
DELETE was a cheap “are you sure?” speed bump (common in lab tools). For **Finalized downloads** that may have been released, **re-enter password** is the logical ship pattern.

### What password confirm does / does not do

| Does | Does not |
|------|----------|
| Confirms the **signed-in Super admin** still holds the password | Replace full dual-control / two-person rule (separate MOB if you want that later) |
| Puts a clear audit: user X confirmed destroy | Recover deleted files (still gone) |
| Stops casual “OK” / typing DELETE from a sticky note culture | Help if the account password is already shared |

---

## Recommendation (one path)

**Do now (no APPLY):** Period → **All time**, Refresh; check Prior exports on a known clip.

**Next APPLY when you want the UX fix:**

`MOB-APPLY REDACT-CLEAR-FINALIZED-PASSWORD-CONFIRM-V1`

| Change | Detail |
|--------|--------|
| Replace “Type DELETE” | Prompt / small dialog: **re-enter login password** |
| Server | Verify password for `req.dashboardUser` (same family as secure-export approve) before `cleanup-finalized` |
| Audit | Keep/strengthen “Finalized redacted copies cleared” with username |
| Single Remove finalized | Same password confirm (optional same MOB — prefer yes, one destructive family) |

**Do not** keep DELETE as the long-term ship gate for Finalized destroy.

**Out of scope for that MOB:** bringing back already-deleted files; changing Period defaults (separate small UX if “This week” defaults keep biting you → e.g. default **All time** on Redacted exports).

Optional follow-up: `REDACTED-EXPORTS-DEFAULT-PERIOD-ALL-V1` if All time should be the default on that tab.

---

## One line

**Empty list is often “This week” filter or you cleared Finalized copies; typing DELETE is a weak confirm — password re-entry is the right accountability for destroy.**
