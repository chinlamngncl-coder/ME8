# MOB DISC — Second-pass redact: where do you load the video?

**Date:** 2026-07-23  
**Status:** APPLIED — `MOB-APPLIED-REDACT-SECOND-PASS-ON-EXPORT-V1-20260723.md`
**Operator question:** Current Redact opens the **evidence original**. After Finalize / Download, you **cannot** pick that redacted file for a 2nd redaction — so where would second pass load from?  
**Parent:** `MOB-DISC-REDACT-POST-PASS-TRIM-JOIN-OR-REREDACT-20260723.md`

---

## You are right

| Fact today | Truth |
|------------|--------|
| **Open Redact** on detail | Always loads the **catalog evidence** (original dock file) |
| Prior exports / Redacted exports list | Shows drafts + finalized MP4s → **Download** / Finalize / Open source — **no** “Redact this export again” |
| Finalized redacted file | A **copy** under exports storage — not a new catalog row you select like evidence |
| So: select finalized for 2nd redact? | **No — not today.** That is exactly the gap this MOB would fill |

Second pass is **not** “use the same Open Redact button and magically get the download.”  
It needs a **new entry** that says: load **this export’s MP4** into the Redact workspace.

---

## Where to put the button (one recommendation)

**Pick: Prior exports row on the evidence detail** (same place you already Finish / Download).

| Place | Why |
|-------|-----|
| **Prior exports** on that clip’s detail — button **Second pass** (or “Redact again”) on a **finalized** (and optionally draft) redacted row | Operator already looks here after Download; source evidence is one click away; custody stays tied to `fileId` + `parentExportId` |
| Redacted exports library (global list) | Also OK as a **second** entry later — same action, jump to workspace with export id |
| Re-upload download into catalog as new evidence | **Reject** — duplicates, messy custody, feels like a workaround |
| Replace “Open Redact” to always use last export | **Reject** — breaks first-pass / confuses original vs copy |

**Locked UX intent for APPLY:**

1. Evidence detail → **Prior exports** → on a redacted row → **Second pass**.  
2. Same Redact screen opens, but the player source = **that export stream** (already-blurred file), not the original.  
3. Mark leftovers (default **manual**; Auto optional / secondary).  
4. Save → **new** export (v2), linked to parent export + original evidence.  
5. Finalize / Download as today. Original and first redacted file stay as-is.

Optional later: same **Second pass** on **Redacted exports** nav list (global). Not required in V1.

---

## What the player is loading (plain)

```
Today first pass:
  Open Redact  →  original evidence file

Second pass (this MOB):
  Second pass on export row  →  that *_redacted_*.mp4 (export stream)
```

You are not “selecting evidence again.” You are selecting a **finished (or draft) redacted copy** from the list that already owns it.

---

## Custody (why not overwrite Download)

| Rule | Why |
|------|-----|
| Never overwrite the finalized file in place | Audit / “what did we release?” stays clear |
| New export id each second pass | Chain: original → redact v1 → redact v2 |
| Meta: `parentExportId`, `mode: second-pass` | Words in custody, not mystery |

---

## What you do **until** this MOB is APPLIED

Still the playbook from the parent disc:

1. Open the **original** evidence → Open Redact.  
2. Manual box the leftover clear faces (or Auto + ✕).  
3. Save → new draft → Finalize → new Download.

No place to “pick the finalized file” yet — that is correct; we have not built it.

---

## APPLY phrase (when you want the button)

`MOB-APPLY REDACT-SECOND-PASS-ON-EXPORT-V1`

**PASS after APPLY:** Prior exports → Second pass on a finalized redacted row → player shows the **already redacted** picture → draw leftover → Save → new download; first finalized file still downloadable unchanged.

---

## One line

**Yes — today you can’t select the finalized file for 2nd redact; second pass would add a Prior-exports “Second pass” that loads that export MP4 into Redact, not the original.**
