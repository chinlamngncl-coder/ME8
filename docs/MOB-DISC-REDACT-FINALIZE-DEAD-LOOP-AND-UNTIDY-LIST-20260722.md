# MOB DISC — Redact Finish Finalize dead loop + Prior exports untidy list

**Status:** DISC 2026-07-22  
**Mode:** Paper only — **no code** until `MOB-APPLY REDACT-FINALIZE-LOOP-BREAK-UI-V1`  
**Search:** `dead loop`, `finish finalize`, `open prior exports did nothing`, `left right buttons`, `note pending`  
**Trigger:** Operator screenshots — banner **Finish Finalize** + Prior exports list with big Download / Finish Finalize buttons zig-zag; clicking Finish Finalize → input page → tab / bounce → Finish Finalize again (**huge dead loop**). Open Prior exports felt like no-op.

---

## Verdict

Two separate failures stacked:

| # | Failure | Operator feel |
|---|---------|----------------|
| **1** | **Dead loop** Finish Finalize ↔ note/input ↔ detail banner | “I can never finish / Download” |
| **2** | **Untidy Prior exports** — fat `btn-action` buttons wrap left/right | “Looks broken / unprofessional” |

Neither is “operator missed a step.” Product bounce + layout debt from finish-loop-v1.

---

## What the screenshots prove

### A — Detail banner (working as intended for *pending*, wrong as *only* exit)

- “Redacted copy waiting — finish Finalize (do not Save again).”  
- Button **Finish Finalize**  

This means at least one redact export is **not** Finalized. Correct warning — but if Finalize UI cannot stick, this banner becomes the trap door of the loop.

### B — Prior exports list

- Some rows: **Finalized** + **Download** (those are done — use them).  
- Many rows: **Note pending** + orange “Download after Finalize” + **Finish Finalize**  
- Many pending rows = **repeated Saves** while stuck (second-burn pile) — each is a real file on disk.  
- Buttons are large `btn btn-action btn-sm` and wrap to next line → **left / right / left / right** visual mess.

---

## Dead loop — root cause (code, not blame)

### Loop engine (primary)

In `openRedactNoteDialog` (finish-loop-v1):

```js
setTimeout(function () {
    if (notePanelLooksVisible()) return;
    goDetailPriorExports(fileId);  // dumps back to detail + banner
}, 80);
```

**80ms is too aggressive.** After **Finish Finalize**:

1. `openRedactNoteDialog` → `showPanel('redact')` + show note phase  
2. 80ms later note may still be painting / computed style not ready / redact panel layout not settled  
3. `notePanelLooksVisible()` returns **false**  
4. `goDetailPriorExports` → back to detail with **Finish Finalize** banner  
5. Operator clicks Finish Finalize again → **same bounce**  

That matches: “comes to this page / key in input / tab / back to Finish Finalize.”

Also: **Open Prior exports** while already on detail (after bounce) only reloads/scrolls Prior exports — **feels like nothing** if you expected a different screen.

### Loop amplifiers (secondary)

| Amp | Effect |
|-----|--------|
| Finalize API requires reason **and** (visible description **or** incident note) (`finalizeRedactExport`) | Empty form → Finalize fails → stay pending → banner stays |
| Many **Note pending** rows from Save-again while lost | Banner + list keep shouting Finish Finalize |
| Nav tab away from redact mid-form | Returns to detail → banner still there (session pending) — looks like loop |
| `openRedactWorkspace` “resume pending?” | Can reopen note → hit same 80ms bounce |

---

## What “done” must look like (locked)

```
Finish Finalize (one exportId)
  → Redaction description panel STAYS visible (no auto-bounce)
  → Fill reason + visible OR incident (show required fields clearly)
  → Finalize & register succeeds
  → Detail Prior exports: that row = Finalized + compact Download
  → Pending banner GONE for that file (unless other drafts remain)
```

**Open Prior exports** when already on detail = scroll + highlight Prior exports (or toast “Already on Prior exports”) — never silent no-op feel.

**Do not** auto-dump note → detail on a short timer.

---

## Untidy list — locked UI target

| Now (bad) | Target |
|-----------|--------|
| Fat blue buttons wrapping under each row | One **compact row**: name · size · status · text link or small ghost action |
| Download button vs Finish Finalize on different wrap columns | Same column for actions (right-aligned), same line when possible |
| Orange “Download after Finalize” + big Finish Finalize | Status chip only; single small **Finalize** text-button/link |
| Banner big primary button | Banner: short text + small **Finalize** link (same style as row) |

No new design system — reuse `btn-ghost btn-sm` / text links like classic Prior exports before finish-loop fat buttons.

---

## Recommended MOB (one APPLY)

**Name:** `REDACT-FINALIZE-LOOP-BREAK-UI-V1`

### Scope (must all ship together)

**A) Break the loop**

1. **Remove** the 80ms “if note not visible → goDetailPriorExports” fallback (or raise to ≥1500ms **and** only if redact panel is still hidden entirely — never if note phase was requested).  
2. Finish Finalize / Open note → stay on note panel until Close / Finalize success / explicit Back.  
3. On Finalize failure: show inline error under fields (“Need visible description or incident note”) — do not bounce to detail.  
4. Open Prior exports: if already on detail, `scrollToPriorExports` + brief highlight; if on redact, close note → detail → scroll (current intent) without re-opening note.  
5. Pending banner: only for **newest** non-finalized redact (or collapse “N drafts waiting”) — avoid screaming for every historical burn. Optional: **Dismiss** clears sessionStorage for that fileId (list rows remain).

**B) Prior exports tidy**

1. Drop `btn-action` size on Download / Finish Finalize in Prior exports + banner.  
2. Row layout: `flex` / grid — meta left, actions right, no wrap zig-zag.  
3. Download = text link or `btn-ghost btn-sm`. Finalize = same.  
4. Keep orange hint only as short status, not a second button-sized block.

**C) Out of scope**

- Burn engine / face-follow  
- Deleting old pending exports automatically (offer later MOB: cleanup drafts)  
- Changing Finalize permission (super-admin)  

### Risk

UI only in `evidence-hub.js` + CSS in `index.html` + en strings. Cache bust. Low for SOS/live/PTT.

### Verify PASS

| # | Test | Pass |
|---|------|------|
| 1 | Finish Finalize → note panel **stays** ≥5s without bounce | ☐ |
| 2 | Fill required fields → Finalize → row Finalized + Download | ☐ |
| 3 | Empty Finalize → inline error, stay on note | ☐ |
| 4 | Open Prior exports from note → lands on list scrolled | ☐ |
| 5 | Already on detail → Open Prior / banner Finalize does not no-op confuse | ☐ |
| 6 | Prior exports list: actions aligned, no fat zig-zag buttons | ☐ |

---

## What to do **today** (before APPLY)

1. Hard refresh once after next APPLY (not yet).  
2. For **already Finalized** rows in your screenshot → use **Download** now (those work).  
3. For **Note pending** rows: do **not** Save again. After APPLY, Finalize **one** row with reason + visible/incident filled.  
4. Ignore the pile of duplicate pending burns until a cleanup MOB — Download the Finalized ones you need.

---

## Related

- `MOB-APPLIED-REDACT-FINISH-LOOP-HANDOFF-V1-20260722.md` — fixed steal-by-loadDetail; **introduced** 80ms bounce + fat buttons  
- `MOB-DISC-REDACT-WHERE-IS-DOWNLOAD-BUTTON-20260722.md` — where Download lives  
- This disc — **break loop + tidy list**

---

## Ask

When ready:  
**`MOB-APPLY REDACT-FINALIZE-LOOP-BREAK-UI-V1`**
