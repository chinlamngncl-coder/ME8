# MOB DISC — Redact progress: “Cancel stops waiting” OUT

**Status:** LOCKED + text removed 2026-07-17 ~01:37  
**Search:** `Cancel stops waiting`, `hidden top`, `redact progress`

---

## Hidden top line (full wording)

Was:

`Still working — {t} elapsed. Long clips can take several minutes. Cancel stops waiting.`

Cropped UI showed only the end: `…ps can take several minutes. Cancel stops waiting.`

---

## Why that phrase was wrong

Cancel does **not** mean “stop waiting, keep redaction healthy.” It aborts the in-flight Save. Operator read it as empty comfort text while Cancel already breaks the job. Removed.

---

## Change

`evidenceHub.redactSaveProgress` →  
`Still working — {t} elapsed. Long clips can take several minutes.`

No “Cancel stops waiting.”

---

## One line

**Full line was Still working / elapsed / long clips. “Cancel stops waiting” deleted.**
