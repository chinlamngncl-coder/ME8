# MOB-APPLIED — REDACT-FINISH-LOOP-HANDOFF-V1

**Date:** 2026-07-22  
**Status:** APPLIED  
**Disc:** `MOB-DISC-REDACT-FINISH-LOOP-NO-LOST-USER-20260722.md`  
**Where to find file:** `MOB-DISC-REDACT-WHERE-IS-DOWNLOAD-BUTTON-20260722.md`  
**Cache:** `evidence-hub.js?v=20260722-redact-finish-loop`

## Root cause fixed

After Save succeeded, `loadDetail(fileId, true)` always called `showPanel('detail')`, which **stole the Finalize screen** and dropped the operator on the “normal” clip page (often with no obvious Download). Felt like blank / video gone / no Finalize.

## What changed

| Fix | Detail |
|-----|--------|
| Quiet detail refresh | `loadDetail(id, true, { quiet: true })` updates Prior exports **without** leaving redact |
| Never-blank fallback | If note panel still hidden after Save → jump to detail + Prior exports banner |
| Pending banner | Detail shows **Finish Finalize** until status Finalized |
| Prior exports | Hint text; **Finish Finalize** button; locked “Download after Finalize”; Download as blue button when Finalized |
| Leave mid-burn | Confirm warn |
| Second burn warn | Resume Finalize vs new burn |
| Copy | Save = on server; where Download lives spelled out on note panel |

## Operator (you)

1. Hard refresh dashboard (**Ctrl+F5**).  
2. Evidence → open source clip → Redact → Save once → wait.  
3. Pass = green ready line + **Finalize & register** + **Open Prior exports** (not a blank page).  
4. Finalize → same clip → **Prior exports** → blue **Download**.  
5. If you leave early: reopen same clip → blue banner **Finish Finalize**.

Do **not** Save again if a Draft `[Redacted]` row already exists.
