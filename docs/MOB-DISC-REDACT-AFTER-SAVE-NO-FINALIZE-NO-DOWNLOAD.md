# MOB DISC — After Save redact: no Finalize · no Download · Save again loop

**Status:** LOCKED 2026-07-17 ~01:14  
**Search:** `where is finalize`, `where is download`, `after waiting save`, `press save again`, `stupid redact`  
**Mode:** DISC only — **no code** until `MOB-APPLY`  
**Trigger:** Operator screenshot still shows mark UI (video + Previews + **Save redacted copy**) after waiting on Save

---

## Straight apology (facts, not fog)

You are right to be angry. The product left you on the **same mark screen** with **Save** again. That is not “operator missed a popup.” That is a **broken post-Save handoff**.

We previously said Finalize / Download live after Save. **On your glass they did not appear.** Saying “look at Prior exports” while you are still stuck on Save was round-tripping. This disc locks what is wrong and what one MOB must fix.

---

## WHAT you should have seen (intended)

| Step | Intended UI |
|------|-------------|
| 1 | Mark faces → **Save redacted copy** (burn — wait) |
| 2 | **Same dialog switches** to **“Redaction description”** with **Finalize & register** (super-admin) / Save draft note / Close |
| 3 | Close → evidence detail → **Prior exports** → `[Redacted] …` → **Download** only after Finalize |

There is **no** separate browser toast. Finalize is **not** on the mark screen. Download is **not** next to Save.

---

## WHAT you actually got (screenshot)

Still:

- Video + face boxes + Preview #1…#5  
- Big **Save redacted copy**  
- **Cancel**  

**No** “Redaction description”  
**No** **Finalize & register**  
**No** Download  

So you never reached step 2 or 3. Pressing Save again = burn again = the loop you named. **Unacceptable.**

---

## WHY (code — root cause, not blame theater)

### Bug A — DOM nesting (primary)

In `evidence-hub.js` `ensureRedactDialog()`:

- `#ev-redact-note-panel` (Finalize lives here) is built **inside** `#ev-redact-mark-panel`
- Sticky **Save / Cancel** footer is also under mark-panel
- On success the code does: `mark-panel.hidden = true` then `note-panel.hidden = false`

**Child cannot show while parent is hidden.** Finalize panel is dead. Dialog looks empty or you stay lost. `.finally` still re-enables **Save redacted copy** text → feels like “do it again.”

### Bug B — success path fragile

Success does `openRedactNoteDialog(res.data.export.exportId, …)`. If `export` is missing / error shape odd → throw → catch → alert (or quiet fail) → **Save button comes back**. Same loop.

### Bug C — Download is later + gated

Even after a good Finalize:

- Download is on evidence detail **Prior exports**, not in the redact dialog  
- Only when status **Finalized**  
- Needs export permission  

That was never explained as a **stuck-on-Save** screen. After a broken handoff, “look for Download” is gaslighting.

### Bug D — Finalize hidden if not super-admin

`fin.hidden = !perms.superAdmin` — if account is not super-admin, Finalize never shows even when note panel works. Separate issue; your shot never left the mark screen, so A/B hit first.

---

## WHERE Finalize / Download are supposed to be (map)

```
[Mark screen]  Save redacted copy  ← you are HERE (stuck)
      ↓ (must auto-switch — currently BROKEN)
[Note screen]  Finalize & register  / Save draft note / Close
      ↓ Close
[Evidence detail]  Prior exports → [Redacted] file · Finalized → Download
```

**Not** under Preview list. **Not** a second Save. **Not** Open Preview (that is original).

---

## HOW the loop happens (your words)

1. Wait minutes on Save  
2. Land back on Save (or blank then reopen mark)  
3. No Finalize → no Download  
4. Press Save again → wait again  

**Product failure.** Not “user should keep pressing.”

---

## Named fix (one MOB — waiting APPLY)

**`mob-evidence-redact-after-save-handoff-v1`**

Must do:

1. **Restructure DOM:** mark-panel / sticky Save footer / note-panel as **siblings** under dialog-inner (not nested)  
2. On Save **success:** hide mark + Save footer; show note panel with **Finalize** (and clear success line: “Redacted copy ready”)  
3. On Save **fail:** stay on mark; **one** clear error — do **not** look like idle Save  
4. After Finalize: close dialog → jump to detail **Prior exports** with `[Redacted]` row visible; Download when Finalized  
5. Cache-bust `evidence-hub.js`  
6. **Do not** ask operator to Save the same burn twice for one clip

Optional follow (only if still needed after handoff PASS):  
`mob-evidence-redact-download-on-finalize-v1` — one Download button on note panel after Finalize for super-admin (so nobody hunts Prior exports).

---

## Operator now (until APPLY)

- **Stop** pressing Save again for the same job unless you **want** another burn.  
- If a `[Redacted]` row already exists on the clip’s **Prior exports** (detail, behind the dialog): use **Add note** / Finalize there — do not re-Save.  
- If nothing in Prior exports: Save never finished deliverable — wait for the handoff MOB.

---

## One line

**Finalize/Download missing after Save = broken handoff (note panel nested under hidden mark panel + Save re-enabled). Not your job to Save forever. APPLY `mob-evidence-redact-after-save-handoff-v1`.**
