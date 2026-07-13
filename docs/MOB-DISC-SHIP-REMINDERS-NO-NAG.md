# MOB DISC — Ship reminders (no daily nag)

**Status:** Locked 2026-07-10 — user directive. **Re-locked after agent failure 2026-07-10 evening.**  
**Search:** `ship remind`, `SOS ledger`, `TOTP pack`, `daily nag`, `Ship parked`

---

## Why you are angry (accepted — agent failure)

You already locked **no daily nag**. You already confirmed **SOS ledger scope PASS**. You have said this **many times** (you count ~5+).

Agents still opened ordinary MOB replies with:

> Ship parked: SOS ledger scope re-test · FM_TOTP_SUSPENDED OFF before customer ship

That is not helpful. It is not “being careful.” It is **ignoring a locked product/ops rule** and wasting your attention while you are mid-FR / fleet / live work.

**Root cause (honest):**

| Layer | What happened |
|-------|----------------|
| Locked disc + ME8 `.cursor` rule | Already said: **never** nag SOS; TOTP **only at pack** |
| Cursor user rule “no daily nag” | Already existed |
| Stale instruction still in some chat contexts | Old text: “DAILY REMINDER … remind at start of every session” |
| Agent behavior | Obeyed the **stale nag** instead of the **newer no-nag lock** — and pasted it mid-session, not only at true session start |

So: not “AI can’t read.” **Conflicting instructions + agent picked the wrong one.** Your anger is correct.

---

## Locked policy (unchanged — enforce harder)

| Item | Session start / MOB replies? | When to remind |
|------|------------------------------|----------------|
| **SOS ledger scope** | **Never** | **PASS** — do not re-ask |
| **TOTP / `FM_TOTP_SUSPENDED`** | **Never** | Only when user says **ship**, **pack**, **customer pack**, **CREATE ship**, or packing checklist |
| **“Ship parked: …” opener** | **Forbidden** | — |

### Agent must not

- Start **any** reply with “Ship parked…” / “ME8 ship reminders…”
- Treat SOS ledger as still pending
- Mention TOTP bench flag on ordinary MOB / FR / live / checkpoint work
- Prefer an old “daily reminder” user-rule text over this disc

### Agent may

- At **ship packing** only: turn off `FM_TOTP_SUSPENDED`, verify authenticator (`MOB-DISC-TOTP-SUSPENDED-BENCH.md`)
- If user asks “what’s left for ship?” — packing list including TOTP; SOS ledger listed as **PASS**

---

## Record

| Item | Result |
|------|--------|
| SOS ledger scoped re-test | **PASS** (user, repeatedly) |
| TOTP before ship | Parked until **packing** — not a daily line |
| Agent re-nag after lock | **FAIL** — user called out 2026-07-10 |

---

## Related

- `ME8-INTERNAL/ship-desk/PRE-SHIP-GATE-CHECKLIST.md` — **print Section A when user says ship/pack** (professional pack gate; not a daily nag)
- `docs/MOB-DISC-SOS-LEDGER-SCOPE-RETEST.md` — PASS  
- `docs/MOB-DISC-TOTP-SUSPENDED-BENCH.md` — packing-only  
- ME8 `.cursor/rules/me8-ship-reminders-no-nag.mdc`  
- ME8 `.cursor/rules/me8-pre-ship-gate.mdc`  
- Cursor user rule: **ME8 ship reminders (no daily nag)**
