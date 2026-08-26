# MOB-DISC — Media Pool: never make the operator press Refresh

**Date:** 2026-08-17  
**APPLY (already landed, lock it):** Media Pool auto-reload while the panel is open  
**Next named APPLY only if files still lag after dock:** `MOB-APPLY MEDIA-POOL-INGEST-PUSH-V1`

## Harm (plain English)

Media Pool took **one snapshot** of dock FTP files, then stopped looking.

What the operator saw:

- Body-worn camera in the dock → files on the server  
- Screen still empty / skeleton until they pressed **Refresh**  
- After a page refresh, the same wait again  

That is not a trial demo. That is a client standing at a dock, thinking the upload failed.

**Forbidden:** tell the operator (or the client) to keep pressing Refresh to see BWC offload.

Refresh on the toolbar may stay as a spare. It is **not** the way the product works.

## Locked rule

While Evidence → Media Pool is open, new dock files **appear by themselves**.

No homework. No “click Refresh after dock.”

## What is already in (do not revert)

- Opening Media Pool always reloads from the inbox API (`force: true`). Do not skip this with “panel already warm.”
- While the Media Pool panel is visible, reload on a short timer (about 8 seconds). Do not poll when the panel is hidden.
- 0 files → skeleton + empty hint. Files present → real rows, skeleton gone.

## If dock files still sit for a long time after this

Then the timer is not enough. Next APPLY (frontend + existing FTP ingest notify only — **no** Prisma, no new case IDs, no SOS matchback rewrite): when a dock file is accepted, push one “inbox changed” signal so Media Pool paints **immediately**, not at the next 8-second tick.

## Operator PASS

1. Open Media Pool. Dock a BWC. **Do not** press Refresh. Files show up on the page.  
2. Leave Media Pool, come back — list is current, not a stale empty skeleton.  
3. Nobody is told to mash Refresh to make FTP work.
