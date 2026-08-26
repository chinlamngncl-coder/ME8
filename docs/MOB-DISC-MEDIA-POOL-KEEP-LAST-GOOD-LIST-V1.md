# MOB-DISC — Media Pool: a quiet poll must never wipe files that just appeared

**Date:** 2026-08-17  
**APPLY (code only after this exact line):** `MOB-APPLY MEDIA-POOL-KEEP-LAST-GOOD-LIST-V1`  
**Scope:** `public/js/ftp-inbox-ui.js` only. No Prisma. No FTP watcher rewrite. No SOS matchback. No new APIs.

## What happened (plain English)

Silent watch was supposed to: look at the inbox in the background, **do nothing** if nothing changed, **paint** only when files actually arrived.

What it did instead: first look saw the BWC files (operator saw them). Next look came back **empty**. The code treated empty as “truth,” replaced the good list, and drew the skeleton. **The files looked deleted.** They were not. The screen lied.

That is worse than asking for Refresh. The operator cannot trust the page.

## Why (one cause)

`load()` compares fingerprints, then **always accepts** the latest JSON.

If a background fetch returns `files: []` (timing during dock write/rename, a blip, or a slow reply finishing after a good one), `lastInboxKey` becomes empty and `paint()` shows skeleton.

A quiet poll is allowed to **add** files. It is **not** allowed to blank a list we already showed, unless the operator really cleared the pool.

## Locked rule

1. Never auto-click Refresh. Never flash Loading on a poll.  
2. Quiet poll returns **empty** while we already have rows → **keep the last good list.** Do not paint skeleton. Do not clear `rows`.  
3. Quiet poll returns **more/changed** files → paint.  
4. Empty is allowed only: first open with a real empty inbox, or operator **Bulk Clear**, or spare Refresh (user clicked) that still comes back empty.  
5. Overlapping fetches: an older empty must not overwrite a newer good list (ignore stale replies).

## Operator PASS (after they type the APPLY)

1. Dock BWC. Files appear **without** Refresh.  
2. Sit on the page. Files **stay**. Refresh button does not blink. List does not go empty on the next tick.  
3. Skeleton only when the pool is truly empty (nothing docked / after a real clear).
