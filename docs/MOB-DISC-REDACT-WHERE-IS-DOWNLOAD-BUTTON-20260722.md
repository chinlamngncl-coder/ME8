# MOB DISC — Where is the redacted file? Where is Download?

**Status:** LOCKED with `REDACT-FINISH-LOOP-HANDOFF-V1` (2026-07-22)  
**Search:** `where download`, `cant see button`, `where is the file`, `prior exports`

---

## Short answer

| Question | Answer |
|----------|--------|
| Where is the file? | On the **server**: `ME8\storage\evidence-exports\…` — **not** your PC Downloads folder yet |
| Where in the app? | Same Evidence clip → scroll **Prior exports** → `[Redacted] …_redacted_….mp4` |
| Where is **Download**? | On that Prior exports row — **blue Download button** — only when status is **Finalized** |
| Why no Download button? | Still **Draft** / note pending → click **Finish Finalize** first (super-admin) |
| After Save, player gone? | Normal — mark tools hide; you should see Finalize. If not: open same clip → **Finish Finalize** banner |

---

## Click path (do this)

```
Evidence Hub
  → open the SAME source video you redacted
  → scroll right/side panel to “Prior exports”
  → row: [Redacted] filename_redacted_xxxxxx.mp4 · Draft|Finalized
       → if Draft: button “Finish Finalize”
       → if Finalized: blue button “Download”
```

Also after Save success screen:

- **Finalize & register** (super-admin)  
- or **Open Prior exports**

---

## You will NOT find Download here

- Browser Downloads folder (until you click Download)  
- Main Evidence library as a new clip (original stays; export is separate)  
- Next to the Save button on the mark screen  
- Evidence → Redacted exports with filter stuck on Finalized while your copy is still Draft (change filter to Draft / All)

---

## Disk (IT only)

`C:\Users\user\Desktop\Enterprise Mobility\ME8\storage\evidence-exports\{fileId}\*_redacted_*.mp4`

Normal operators use Prior exports → Download, not Explorer.

---

## One line

**Prior exports on the same clip → Finish Finalize → then blue Download. No Finalize = no Download button.**
