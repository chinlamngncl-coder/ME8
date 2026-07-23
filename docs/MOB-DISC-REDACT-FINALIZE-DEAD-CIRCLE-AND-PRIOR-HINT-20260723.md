# MOB DISC — Finalize dead circle · Prior exports hint · two old Finalized rows

**Date:** 2026-07-23  
**Status:** APPLIED 2026-07-23 — `MOB-APPLY REDACT-FINALIZE-DONE-NO-LOOP-V1` (copy **N2 + P1**)  
**See:** `docs/MOB-APPLIED-REDACT-FINALIZE-DONE-NO-LOOP-V1-20260723.md`  
**Follow-on paper:** `docs/MOB-DISC-PRIOR-FINALIZED-DOWNLOAD-ONLY-20260723.md` (Finalized row = Download only)  
**Operator:** (1) Finalize feels like an endless loop — red “already finalized”, draft save fails, Close returns to the same circle; wants clearer “it is finalized → second pass = find file” wording. (2) Stuck with **two old Finalized** rows on Prior exports — what to do.  
**Screens:** Note panel still showing **Finalize & register** after done · Prior exports hint about Second pass / burn time.

---

## Part 1 — What the “dead circle” actually is

### What you are seeing

| Click | What happens |
|-------|----------------|
| **Finalize & register** | Server says **Redacted export already finalized** (red text) |
| **Save draft note** | Same block — notes cannot change after Finalize |
| **Close** / **Open Prior exports** | Leaves note panel → detail / Prior exports |
| Then **Finish Finalize** banner, or Save → “OK = Finish Finalize”, or reopen note | Back on the **same** note screen with Finalize still lit |

So it is not “Finalize never worked.” The copy **is already Finalized**. The UI is still treating it like a draft that needs Finalize.

### Why (code truth)

1. After a successful Finalize, the happy path is **Done** panel (Download + Prior exports).  
2. A **session reminder** (`me8.redactPendingFinalize`) can still point at that export.  
3. Banner clear only runs when a **non-finalized** row is found and then seen as finalized — if **all** redacts are already Finalized but the reminder remains, the banner still says **Finish Finalize** and reopens the note form.  
4. Note form always offers **Finalize & register**. Clicking it first tries **Save draft note**, which the server **rejects** on Finalized → you see “already finalized” and never reach Download-done.  
5. That matches your screenshot: green “saved… Next: Finalize” + yellow where-to-download + red **already finalized** + Finalize still enabled.

**Not a custody bug** — the two Prior exports with **Download** are the real Finalized files. The loop is **stale “still need Finalize” UI** on a done export.

---

## Part 1b — Hint / screen options (pick wording family)

Goal when copy is **already Finalized**: stop offering endless Finalize; say **done**; point **second pass** to Prior exports.

### Note / error panel (when already finalized)

| Opt | Copy direction |
|-----|----------------|
| **N1** | Banner: **This redacted copy is already Finalized.** Buttons: **Download** · **Open Prior exports** · **Close**. Hide Finalize + Save draft. |
| **N2** | Same as N1 + line: **Need more blur? Prior exports → Second pass on that file** (do not Finalize again). |
| **N3** | Short: **Already Finalized — use Download or Prior exports. Second pass starts from Prior exports, not this screen.** |

### Prior exports section hint (replace current long sentence)

Current: *“Finalized rows show Download. Use Second pass to load that redacted copy and blur leftovers. Burn time is listed so the source clip date in the file name is not mistaken for a stuck system.”*

| Opt | Proposed hint |
|-----|----------------|
| **P1** | **Download** = this redacted file is done. **Second pass** = open that file again to blur more. Burn time = when this copy was made (file name date is the original clip). |
| **P2** | Finalized = finished. To blur leftovers: **Second pass** on that row — not Finalize again. |
| **P3** | Each row is a saved redacted copy. Download it, or **Second pass** to blur more on that copy. |
| **P4** | Done files show **Download**. More blur → **Second pass** (loads the redacted copy). Ignore the date inside the file name for “is the system stuck?” — use **Burned …** instead. |

### Agent wording pick

- Note panel when already Finalized: **N2** (clear + second-pass pointer).  
- Prior exports hint: **P1** (Download / Second pass / burn vs file-name date in one short block).

---

## Part 1c — Behaviour fix (recommended APPLY)

`MOB-APPLY REDACT-FINALIZE-DONE-NO-LOOP-V1`

| Change | Detail |
|--------|--------|
| Open note | If export status is **finalized** → go to **Done** panel (Download), not note form; clear pending |
| Banner | If session pending’s export is Finalized (or no drafts left) → **clear pending**, no Finish banner |
| Finalize click | If server says already finalized → treat as success path → Done panel + clear pending (not red forever) |
| Copy | N2 on Done/already-finalized; Prior hint → **P1** (or your letter) |
| Save draft | Stay blocked on Finalized (correct); hide button when Finalized |

**Out of scope:** deleting old files (Part 2); changing Second pass burn logic.

---

## Part 2 — Stuck with 2 old Finalized rows — what to do **now** (no APPLY)

Those two rows with **Download** are normal Finalized custody copies for that source clip. They are not “stuck Finalize.”

| If you want… | Do this |
|--------------|---------|
| **Keep them** (downloads / release) | Leave them. Use **Download**. For more blur on one copy → **Second pass** on that row. |
| **Drop both** (lab clutter) | **Clear finalized (2)** → confirm → **your password** (just applied). Original library clip stays. |
| **Drop one** | That row’s **Remove** → confirm → password. |
| **Redacted exports tab empty** | Period → **All time**, then Refresh — or they were cleared earlier. |

Do **not** keep clicking Finalize on the note screen to “fix” the two rows — they are already done.

---

## Risk pick (one path)

1. **Now:** Password-clear or keep the two Finalized rows (your call on clutter vs keep downloads).  
2. **Next APPLY:** `REDACT-FINALIZE-DONE-NO-LOOP-V1` with copy **N2 + P1** unless you name other letters.

---

## One line

**Circle = UI still offering Finalize on an already-Finalized export; the two Prior rows are real done files — Download / Second pass / or Clear with password; next APPLY stops the loop.**
