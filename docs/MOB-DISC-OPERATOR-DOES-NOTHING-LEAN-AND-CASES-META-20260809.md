# MOB DISC — Operator does nothing + Cases status garbage (2026-08-09)

**Status:** LOCKED.  
**You:** Confused / angry — fair. Agent dumped a “paste this code” homework and left a stupid **Could not load cases** line on Cases.

---

## 1. What you do with CREDIT-LEAN-HARD

**Nothing.**

- You do **not** need to paste codes every turn.  
- Lean / no-scan is **standing agent duty** (already in rules + prior discs).  
- The code `CREDIT-LEAN-HARD` is optional **only if you want to slap the agent** mid-turn. It is **not** a user checklist.  
- Agent must never again imply “you must type this or I burn credits.”

If the agent burns credits on greps again — that is agent failure, not your job to prevent with rituals.

---

## 2. “Could not load cases” — why it appeared / why it’s stupid

That string is **not** a search box and **not** “gathering results.”

It was an **error fallback** I added when `/api/ops-cases` returned HTML (login page / wrong response) instead of JSON — so the panel meta showed:

`Could not load cases`

On a quiet Cases screen with no user “search,” that looks like idiot product chrome. Wrong.

**Locked product rule:**

| Allowed | Forbidden |
|---------|-----------|
| Empty list: calm empty state only (“No cases in this period.”) | Meta/status line that looks like a search or load prompt when the user did not ask for a fetch failure lecture |
| Silent empty if not logged in / API not ready (or one calm “Sign in required” if auth) | Raw parse errors, “Could not load cases” sitting there like a feature |

**APPLY:** `OPS-CASE-UI-META-QUIET-V1` ✅ (2026-08-09)  
→ no Loading / Could not load cases in meta; fail → quiet empty state; detail fail → back to list (no alert).

---

## 3. Agent

- Stop inventing operator homework.  
- Stop burning credits to “explain” lean.  
- Do not “fix” Cases meta until `OPS-CASE-UI-META-QUIET-V1`.
