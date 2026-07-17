# MOB DISC — Redacted video: WHERE / HOW / WHAT (no popup)

**Status:** LOCKED 2026-07-17 ~00:59  
**Search:** `where download`, `no popup`, `I do not see`, `Prior exports`, `Finalize`  
**Trigger:** Operator — Saving bar / no toast / no obvious Download

---

## WHAT (honest)

There is **no** browser toast and **no** new floating “your video is ready” popup.

| Stage | What you should see |
|-------|---------------------|
| Blue bar “Saving face-follow…” | Still burning. **No file to open. No Download yet.** |
| Save **succeeds** | Same **Redact video** window switches to **“Redaction description”** (reason / visible / incident + **Save draft note** / **Finalize & register** / Close). Not a second OS popup. |
| After Close / Finalize | Same Evidence **detail** page for that clip → heading **“Prior exports”** → line **`[Redacted] …mp4`** |
| **Download** link | Only on that Prior-exports line, and **only after Finalize** (status shows **Finalized**). Draft / Note pending = **no Download link**. |

**Open Preview** / big detail **Download** = **original** sealed recording — **not** the redacted copy.

---

## WHERE (exact UI map)

```
Evidence Hub
  → open the same clip you redacted (detail)
  → button Redact… (opens modal)
       while saving: blue bar only
       after save OK: same modal → “Redaction description”
  → Close (or Finalize first if you are super-admin)
  → still on that clip’s detail — scroll the side/panel
  → heading: Prior exports
  → row: [Redacted] <filename> · size · Draft|Finalized
       → word Download (link) only when Finalized
```

On disk (server PC, not a UI popup):

`ME8\storage\evidence-exports\{fileId}\…_redacted_….mp4`

Normal path = **Prior exports**, not hunting folders.

---

## HOW (operator clicks — order)

1. Wait until the blue bar **stops**. If it turns red (cancel/timeout/error) → **no** new redacted deliverable.
2. In the **same** Redact window, fill/check **Redaction description** if shown.
3. If you see **Finalize & register** (super-admin only) → click it.  
   If you do **not** see Finalize → you are not super-admin; row stays Draft until a super-admin finalizes. Close is OK; file can already exist as draft.
4. Close the Redact window.
5. On the **same** evidence detail, find **Prior exports** (below case info / custody area — not a toast).
6. Click **Download** on the `[Redacted]` line **after** it says **Finalized**.

---

## WHY you see nothing (checklist)

| You feel | Likely reason |
|----------|----------------|
| No popup | **By design.** Same Redact modal → note panel, then Prior exports. |
| Still only blue bar | Save not finished yet (minutes on long clips). |
| Bar gone, no note panel | Save failed / cancelled / timed out — read red text on the bar; try Save again. |
| Closed modal, no Download | Look for **Prior exports** on detail. If missing → Save never succeeded. |
| See `[Redacted] … Draft` but no Download | **Expected.** Finalize first (super-admin). |
| No **Finalize & register** | Account is not super-admin (`Finalize` is hidden). |
| Clicked top **Download** / Open Preview | That is the **original**, not the redacted export. |

---

## One line

**No toast. Wait for Save → same Redact window “Redaction description” → Finalize (super-admin) → same clip detail → Prior exports → `[Redacted]` → Download.**
