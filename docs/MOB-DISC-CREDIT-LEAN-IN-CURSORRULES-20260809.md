# MOB DISC — Put CREDIT-LEAN-HARD in Cursor rules (2026-08-09)

**Status:** LOCKED. Operator: soft promises fail daily; needs a **hard rule file**, not chat apology.

---

## Already on disk (this project)

`.cursor/rules/me8-credit-lean-hard.mdc`  
Disc: `MOB-DISC-CREDIT-LEAN-HARD-CODE-20260809.md`

Paste anytime: `CREDIT-LEAN-HARD` / `MOB-LEAN-NO-SCAN` / `NO-SCAN-THIS-TURN`

---

## Yes — put it where Cursor always loads

| Place | What to do |
|-------|------------|
| **Project** `.cursor/rules/me8-credit-lean-hard.mdc` | Already there — keep `alwaysApply: true` if present |
| **Project** `.cursorrules` (root) | Add one line: obey `CREDIT-LEAN-HARD` / me8-credit-lean-hard on every turn |
| **Cursor User Rules** (all projects) | Paste the same hard limits once — survives new chats |

**Recommend:** User Rules + project rule both. Chat apology alone = worthless.

---

## Hard limits (copy into User Rules)

```text
CREDIT-LEAN-HARD (ME8): Prefer zero search. Max 1–3 files named by the user/APPLY.
No repo-wide Grep/Glob/Task explore. No whole server.js / giant index.html tours.
Short replies. Patch only the exact blocks. Violating after CREDIT-LEAN-HARD = failure.
```

**No product code from this disc.** Operator can edit User Rules in Cursor Settings; agent edits project `.cursorrules` only on explicit APPLY later if asked.
