# MOB DISC — Finish redact loop: blank / no Finalize / leave & lost

**Status:** DISC 2026-07-22 (plan to **finish** — not another half-fix)  
**Mode:** Paper only — **no code** until `MOB-APPLY REDACT-FINISH-LOOP-HANDOFF-V1`  
**Search:** `blank no finalize`, `went away came back`, `lost redact`, `daily crazy`, `finish redact loop`  
**Operator report:** After Save/processing → **blank with no Finalize**. Left the screen. Came back → **normal evidence page**. No answer where the work went. Would drive users crazy every day.

---

## Verdict (lock this)

| What you saw | What it means |
|--------------|---------------|
| Blank · no Finalize | **Broken or interrupted handoff** — product failed to keep you on the note/Finalize screen |
| Left · came back · “normal” detail | UI reset to source clip. That does **not** mean the burn failed |
| No clear next step | Missing **recovery banner** on the normal page — root of daily confusion |

**Product contract we must finish:** After a successful burn, the user **always** has one obvious next action — either on the redact panel **or** on the source detail — until Finalize (or a clear “draft parked” state with one button).

This disc **supersedes** half-answers in older discs for the *daily lost-user* path. Disk path facts stay in `MOB-DISC-REDACT-WHERE-DOES-IT-GO.md`. Nested-Finalize DOM bug was APPLIED as `mob-evidence-redact-after-save-handoff-v1` — still not enough if leave/blank/recovery is weak.

---

## What “normal page” should have told you (and didn’t)

On the **same source clip** detail:

1. **Prior exports** should list `[Redacted] …_redacted_….mp4` (often **Draft** / note pending).  
2. There is already an **Add note** control on non-finalized redact rows (reopens note/Finalize). Easy to miss.  
3. **Download** only after **Finalized**.  
4. Evidence → **Redacted exports** defaults to **Finalized** — drafts look “gone.”

So: file may already be on the server; the UI just **abandoned the ceremony** when you left or when blank won.

---

## Failure modes we must kill (plan well)

### F1 — Blank after Save (no Finalize visible)

Mark panel hidden for note phase; note panel never paints / empty / wrong panel / cache.

**Must never show:** empty redact shell with neither mark tools nor note/Finalize.

### F2 — Navigate away during Save (“Still working…”)

Today `closeRedactDialog` → **`abortRedactSaveInFlight()`** cancels the browser request. Server may still finish or may abort — **operator has no certainty**.

**Must:** Warn before leave if burn in flight; if leave anyway, land on detail with honest status: “Burn may still be running / check Prior exports in a minute” — never silent normal page.

### F3 — Navigate away after Save succeeded, before Finalize

Burn OK · exportId exists · note screen skipped or abandoned → detail looks “normal.”

**Must:** Sticky **banner on that evidence detail**:  
“Redacted copy ready — **Finish Finalize**” → one click reopens note/Finalize for that `exportId`. Persist until Finalized or dismissed with confirm.

### F4 — “Save again” temptation

Blank / lost → press Save again → second burn → more drafts → more confusion.

**Must:** If a **non-finalized** redact export already exists for this clip from the last few minutes, Save path offers **Resume Finalize** first (or warn before new burn).

### F5 — Redacted exports list looks empty

Default filter = Finalized → drafts invisible.

**Must:** After leave-from-burn, either deep-link Prior exports **or** Redacted exports with status **Draft / All** once.

---

## Locked happy path (what “finished” means)

```
1 Mark faces / auto face-follow
2 Save redacted copy (server) — wait; never leave without warning
3 Same panel: “Redacted copy ready on server · original unchanged”
   + note fields
   + Finalize & register (super-admin)  OR  Save draft note + clear “parked” copy
   + Open Prior exports
4 Finalize → detail Prior exports → [Redacted] · Finalized → Download
```

**Leave at any time after step 3 success:** detail shows **Finish Finalize** banner until done.  
**Never** require the user to remember a disk folder or re-mark faces to finish paperwork.

---

## Recommended MOB (one APPLY — finish the loop)

**Name:** `REDACT-FINISH-LOOP-HANDOFF-V1`

**One MOB, three hard outcomes — do not ship half:**

### A) Never blank

- After Save success: assert note panel visible; if not, **fallback** `closeRedactDialog` → detail + banner + scroll Prior exports (never empty shell).  
- Cache bust `evidence-hub.js` hard.  
- Success copy: server copy ready · original unchanged · Download after Finalize.

### B) Leave-safe

- If `saving === true` and user hits Back/Close/nav: confirm  
  “Burn still running. Leave anyway?”  
  - Stay → continue progress  
  - Leave → detail banner: “Check Prior exports shortly · do not Save again yet”  
- If Save already succeeded (`saveSucceeded` / exportId): leave **must not** look like failure — open detail + **Finish Finalize** banner immediately.

### C) Recovery always on the normal page

- Banner / card on evidence detail when any redact export for this file is **not finalized**:  
  **“Redacted copy waiting — Finish Finalize”** + button → `openRedactNoteDialog(exportId, …)`  
- Prior exports row: rename/strengthen control to **Finish Finalize** (not only quiet “Add note”).  
- Optional: sessionStorage `me8.redactPendingFinalize = { fileId, exportId }` so refresh still shows banner.  
- Redacted exports: after a known draft create, don’t strand user on Finalized-only empty list (open All/Draft once or toast “draft — open Prior exports”).

### Out of scope (this MOB)

- Changing burn engine / face-follow / disk root  
- Auto-download to PC on Save  
- Overwriting original evidence  
- Non–super-admin Finalize permission redesign (keep gate; non–super-admin still gets **Save draft** + clear “ask super-admin” + Prior exports row)

### Risk

UI + sessionStorage only. No SOS / live / PTT / WVP. Medium care on abort vs leave messaging.

### Verify (PASS = stop the daily crazy)

| # | Test | Pass |
|---|------|------|
| 1 | Save → wait → **Finalize visible** (not blank) | ☐ |
| 2 | Finalize → Prior exports Download | ☐ |
| 3 | Save success → leave before Finalize → detail shows **Finish Finalize** → completes | ☐ |
| 4 | Leave mid-Save → confirm warn → detail honest message; no silent vanish | ☐ |
| 5 | After draft exists, Save again → warn or Resume — no silent second burn | ☐ |
| 6 | Hard refresh on detail with pending draft → banner still there | ☐ |

Operator: restart/refresh once after APPLY; pass/fail from what they see.

---

## What to do **today** (before APPLY) if you already burned once

1. Open the **same** source clip in Evidence (the one you redacted).  
2. Scroll **Prior exports**.  
3. If you see `[Redacted] …` Draft → use **Add note** / finish Finalize there. **Do not Save again.**  
4. If nothing in Prior exports → burn never landed (or abort won) → only then redact + Save once more after APPLY.  
5. Evidence → **Redacted exports** → set status to **Draft** or **All** if the list looked empty.

---

## Related (do not re-open as separate half MOBs)

| Doc | Role |
|-----|------|
| `MOB-DISC-REDACT-SAVE-VIDEO-GONE-WHERE-KEEP-20260722.md` | Where file lives |
| `MOB-DISC-REDACT-AFTER-SAVE-NO-FINALIZE-NO-DOWNLOAD.md` | Nested Finalize bug (APPLIED handoff-v1) |
| `MOB-APPLIED-EVIDENCE-REDACT-AFTER-SAVE-HANDOFF-V1.md` | Sibling panels — necessary but not sufficient |
| This disc | **Finish** leave/blank/recovery so daily users never get lost |

Older proposed name `REDACT-SAVE-RESULT-HANDOFF-UX-V1` is **absorbed** into **`REDACT-FINISH-LOOP-HANDOFF-V1`** — one APPLY, full loop.

---

## Ask

When ready to implement:  
**`MOB-APPLY REDACT-FINISH-LOOP-HANDOFF-V1`**

That is the go-ahead to close blank / no Finalize / leave-and-lost for good.
