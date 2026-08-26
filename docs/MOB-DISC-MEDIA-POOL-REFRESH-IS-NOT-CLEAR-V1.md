# MOB-DISC — Media Pool is the dock staging pool. Refresh is not Clear.

**Date:** 2026-08-18  
**APPLY (code only after this exact line):** `MOB-APPLY MEDIA-POOL-REFRESH-IS-NOT-CLEAR-V1`  
**Scope:** copy + `public/js/ftp-inbox-ui.js` empty-wipe rule. No Prisma. No FTP folder move. No SOS matchback.

## Your question, answered

**Yes. That is the design.**

Media Pool (`#ev-panel-ftp-inbox`) is the **unassigned dock staging pool**.

1. BWC goes in the dock.  
2. Files land in the FTP inbox / staging storage.  
3. **This page is how you see that pool** — Review, Analyze, + Case.  
4. Files **stay** until someone assigns them to a Case, or uses **Bulk Clear** (that one is delete-from-pool).  
5. They are **not** the Evidence Library yet. Library is after assign / admit.

Refresh has **nothing** to do with clearing. Refresh means: look at the pool again.

## What I said wrong

“Do not press Refresh” was only a **test line** (prove files appear without the button). It was **not** a product rule.

Operators and clients **may Refresh any time**. The pool must still show the same files.

## What was the mess

A background look (and, as written today, a **clicked** Refresh) that got an empty blip was allowed to blank the list. That made Refresh feel like Clear. It is not. **Bulk Clear** is the only empty-on-purpose control.

## Locked rule

| Control | What it does |
|---|---|
| Opening Media Pool / silent watch / **Refresh** | Show the pool. Never delete. If the look comes back empty by mistake, **keep the last good list.** |
| **+ Case** / Bulk Add to Case | Assign out of the pool (that file leaves because it was linked — not because of Refresh). |
| **Bulk Clear** | Operator really removes from the pool. Then empty is allowed. |

No “don’t touch Refresh.” No Refresh-as-homework. No Refresh-as-wipe.

## Operator PASS (after APPLY)

1. Dock BWC. Files show in Media Pool and **stay**.  
2. Press Refresh (or hard-refresh the browser). **Same files still there.**  
3. Bulk Clear is the only way the list goes empty on purpose.
