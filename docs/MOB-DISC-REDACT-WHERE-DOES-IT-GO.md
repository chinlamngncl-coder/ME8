# MOB DISC — Where does the redacted video go? Where do I see it?

**Status:** LOCKED 2026-07-17 ~00:57  
**Search:** `where does it go`, `see the video`, `face-follow saving`, `redacted copy`  
**Operator:** Saving bar showing — wants folder + UI place

---

## Plain answer

| Question | Answer |
|----------|--------|
| Where is the file written? | On the **server PC**, under Evidence exports storage — **not** into the original recording |
| Does Save change the original? | **No.** Original stays sealed. New file: `*_redacted_XXXXXX.mp4` |
| Where do I see it in the app? | Same Evidence detail → **Prior exports** / list row **`[Redacted] …`** → **Download** after finalize |

---

## While the blue bar says “Saving…”

Burn is still running. **No finished file to open yet.**  
When it finishes:

1. Details / finalize panel (if you already filled draft details, they should be there)  
2. **Finalize** (super-admin) when ready  
3. Back on the evidence detail: redacted copy listed → **Download** / play via export stream  

If Save **fails / Cancel / timeout** → no new redacted file (or incomplete — treat as no deliverable).

---

## Disk path (lab / ME8)

Root (typical):

`C:\Users\user\Desktop\Enterprise Mobility\ME8\storage\evidence-exports\`

Then:

`{evidenceFileId}\{exportId}_{originalBase}_redacted_{shortId}.mp4`

Example pattern you already saw in the UI:

`[Redacted] 20260707223538-00N_redacted_231b19.mp4`

Agent/ops can open that folder on the server if needed. **Normal operator path = Evidence Hub list + Download**, not hunting disk.

---

## UI map (one screen)

```
Evidence → open the source clip
  → Redact → Save (this bar)
  → after success: note / Finalize
  → same detail: Prior exports / [Redacted] row
  → Download (when finalized)
```

Controlled preview / “Open Preview” on the **left** is still the **original** (privacy-gated). Redacted copy is the **export** row, not that preview.

---

## One line

**New file under `storage/evidence-exports\…` — see it as `[Redacted]` on the same evidence detail after Save finishes; Download after finalize. Original unchanged.**
