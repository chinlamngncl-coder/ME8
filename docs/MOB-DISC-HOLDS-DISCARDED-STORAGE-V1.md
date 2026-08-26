# MOB-DISC — Investigation holds: Discarded vs storage (no panic delete)

**Date:** 2026-08-17  
**APPLY:** none unless operator later wants a one-line Discarded hint  
**Scope:** Facts only. Do not add a bulk-delete. Do not change retention of Evidence Library files.

## What Discarded is

**Discard** is not “wipe the server.” Confirm copy already says it leaves **Open** and **stays for audit**.

Statuses: open → discarded (or cleared / linked). The card in Show: Discarded is the **audit copy** of a hold you released (ada / Chin in the screenshot).

You do **not** have to Clear or Delete each discarded card to keep the site running.

## Does it fill the disk?

| Piece | What happens |
|---|---|
| Hold **JPEG** (FR snap on the card) | Auto-removed after **30 days** discarded (`purgeExpiredDiscardedMedia`, every 6 hours + startup). |
| Hold **JSON + disposition log** | **Kept** (small). That is the audit trail. |
| **Evidence Library** video (`…MP4`) | **Not** deleted by Discard. That file is the catalog. **Retention clearance** is the job for old library media. |

Discarded holds will not run the disk to zero by themselves. The heavy files are library/FTP media, not these cards.

## What other enterprise software does

Same pattern: **release the hold** (stop treating it as live work) → **keep a disposition record** → **drop bulky media after a cooling period** → **do not** make the operator bulk-erase audit rows. Legal/e-discovery: releasing a hold does not mean “delete everything tonight.” Retention policy deletes or archives the corpus later.

## Operator

Leave Show: Discarded as a history view. No extra clear/delete pass required. If the list is noisy, that is a later named APPLY (hide after 30 days, not wipe audit).

Sentence-case / `&` chrome is **`UI-COPY-SENTENCE-CASE-V1`**, not this disc.
