# MOB DISC — Redact Save “video gone” / where do I keep it?

**Status:** DISC 2026-07-22  
**Mode:** Paper only — **no code** until `MOB-APPLY …`  
**Search:** `where save redact`, `video gone after save`, `where keep redacted`, `processing then gone`  
**Trigger:** Operator: redact → Save → processing → video disappears → unclear where the file is kept

---

## Plain verdict

You did **not** lose the recording.

| What happened | Truth |
|---------------|--------|
| Save / processing finished | Server created a **new** file: redacted **export** |
| Original clip | **Unchanged** (still in Evidence library) |
| Why the player “vanished” | UI **hides** the mark/player on purpose and switches to **note / Finalize** — feels like the video was deleted |
| Where the new file lives | **Server disk:** `storage/evidence-exports\…` — **not** your Downloads folder, **not** a new library row |
| Where you find it in the app | Same source clip → **Prior exports** → `[Redacted] …` **or** Evidence Hub → **Redacted exports** |
| When you can Download | Only after **Finalize & register** (status Finalized) |

**One line:** Save = “burn a redacted **copy** on the server.” The editor then swaps to paperwork. The movie is under **Prior exports / Redacted exports**, not back in the player.

---

## Where am I supposed to keep / save it?

There is **no folder picker** and **no “Save as…”** to your PC.

| Place | Role |
|-------|------|
| **Server** `ME8\storage\evidence-exports\{fileId}\*_redacted_*.mp4` | Durable home of the redacted file |
| **Prior exports** (on the **same** source evidence detail) | Operator list of copies for that clip |
| **Evidence → Redacted exports** | Hub browser of redacted exports (default often shows **Finalized** only) |
| Browser Downloads | Only after you click **Download** on a **Finalized** export |

You do **not** “keep” it by leaving the redact player open. Closing the redact panel is fine — the export file stays on the server.

---

## What you should do next (operator checklist)

1. After the green **“Redacted copy ready”** / note screen → fill note if needed → **Finalize & register** (if you are super-admin).  
2. **Close** / Back → open the **same** source clip again.  
3. Scroll to **Prior exports** → row like `[Redacted] …_redacted_….mp4`.  
4. **Download** only when status is **Finalized**.  
5. Or: Evidence Hub left nav → **Redacted exports** (if the list looks empty, try status **Draft** / all — drafts hide under the Finalized filter).

If the player vanished and you **never** saw Finalize / “Redacted copy ready”:

- Hard refresh once  
- Open the **same** source → **Prior exports** (file may already exist from a successful burn)  
- Do **not** hammer **Save** again unless you want a **second** burn  

(Older bug: Finalize panel nested under hidden mark UI — fixed by `mob-evidence-redact-after-save-handoff-v1`. If that returns, say so.)

---

## Why this feels confusing (product fault, not operator fault)

1. **Word “Save”** sounds like “save to my computer.” Product meaning = **create server export**.  
2. **Player disappears** after success → reads as “gone / failed.”  
3. Result is **not** a new Evidence library clip — easy to hunt the wrong list.  
4. **Download** is gated behind **Finalize** — file can exist on disk while Download is still missing.  
5. **Redacted exports** default filter can hide drafts → “list empty” after Save.

Related locked discs (do not re-litigate separately):

- `MOB-DISC-REDACT-WHERE-DOES-IT-GO.md`  
- `MOB-DISC-REDACT-AFTER-SAVE-NO-FINALIZE-NO-DOWNLOAD.md`  
- `MOB-APPLIED-EVIDENCE-REDACT-AFTER-SAVE-HANDOFF-V1.md`  
- `MOB-APPLIED-EVIDENCE-REDACTED-EXPORTS-BROWSER-V1.md`

---

## Recommended next MOB (one path — agent pick)

**Name:** `REDACT-SAVE-RESULT-HANDOFF-UX-V1`

**Goal:** After burn success, make destination impossible to miss — without changing burn/disk layout.

**In scope (UI copy + one obvious link only):**

1. Success banner text: **“Redacted copy saved on server. Original unchanged.”**  
2. One button: **“Open Prior exports”** (same source detail, scroll/highlight the new `[Redacted]` row).  
3. Second line: **“Download unlocks after Finalize.”**  
4. Rename footer control if cheap: **“Save redacted copy (server)”** or keep Save + subtitle under the button.  
5. After success, keep a **small preview / Open redacted** affordance if stream allows before Finalize — **only if** existing export-stream already permits draft play; otherwise link to Prior exports only (no new player stack).

**Out of scope:**

- Changing disk root / inventing a Windows “Save as”  
- Auto-download to browser on Save  
- Replacing original in library  
- Rebuilding Evidence Hub  

**Risk:** Low (copy + navigation). Does not touch SOS / live / PTT / WVP.

**Verify:** Redact → Save → see success text + Prior exports link → Finalize → Download works; original still opens from library.

---

## Agent must not

- Tell the operator to dig `storage\` as the primary path (IT only)  
- Say “just Save again” when the file may already exist  
- Bundle Valkey / WVP / unrelated Evidence MOBs into this UX fix  

---

## Operator ask

Confirm what you saw after processing:

- **A)** Note / Finalize screen (“Redacted copy ready”) — then unclear where Download is  
- **B)** Player gone / blank — **no** Finalize  
- **C)** Something else (say what)

Then either:

- Use the checklist above now (Prior exports / Redacted exports), **or**  
- Say **`MOB-APPLY REDACT-SAVE-RESULT-HANDOFF-UX-V1`** to fix the wording + handoff so this stop happening.
