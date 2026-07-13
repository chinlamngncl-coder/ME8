# MOB DISC — Rules are life and death (agent must obey)

**Status:** LOCKED 2026-07-13 — user order: check rules, follow strictly  
**Search:** rules, life and death, must follow, silent change, brand, 172, MOB-APPLY  
**Fault:** Agent broke locked rules (brand keys, silent product face risk, brittle i18n) — user called it out.

---

## Plain answer

**Our Cursor / ME8 rules are not optional tips.**  
Treat them as **life and death** for the product and for trust.

If a rule says **talk first**, **Axiom stays**, **no 172**, **one MOB**, **locked files** — **do that**. No “helpful” shortcuts.

---

## Rules that were broken (recent)

| Rule | What agent did wrong |
|------|----------------------|
| **No silent change** | Invented / flipped product face (C2) without advance talk |
| **Axiom stays** | Treated “C2” as UI name without user yes |
| **Talk → yes → MOB-APPLY** | Changed brand-related markup/keys as if approved |
| **Don’t invent brittle UI keys** | `login.brandPrimary` / `login.brandAccent` → humanize → **Brand Primary** on login |
| **One careful fix** | Brand/i18n churn left English keys missing |

**Not an excuse:** “queue text I wrote”, “professionalism”, “ship help”.

---

## Life-and-death checklist (every turn)

Before **any** edit, agent must pass this:

1. User said **MOB-APPLY** or **go ahead** for **this exact** item? If not → **do not edit** (discuss / paper disc only).  
2. **Is it brand / Axiom / product face?** If yes → only after explicit yes (Axiom unless they order otherwise).  
3. **Is it a locked file** (PTT / live video / SIP cores)? If yes → stop unless user named that file.  
4. **Would this put 172.x as server IP?** Never.  
5. **One MOB only** unless user listed several **by name** in one message.  
6. **No pay / upgrade nag.** No daily SOS/TOTP nag.  
7. **No creativity / inventing** — not even a small change without APPLY / go-ahead.  
8. **After agree:** disc locks memory — disc is **not** permission to change first.

---

## Order of work (locked)

```
User talks / picks from list
  → short confirm if brand or risky
  → user says MOB-APPLY <name>
  → agent edits ONLY that
  → agent states file + why
  → user tests
  → next
```

---

## Cursor rules that enforce this

| Rule file | Topic |
|-----------|--------|
| `me8-no-silent-change.mdc` | Talk first |
| `me8-brand-axiom.mdc` | Axiom stays |
| `me8-no-wsl-172.mdc` | Never 172 server IP |
| `me8-login-factory-hint.mdc` | Factory hint gate |
| `me8-ship-reminders-no-nag.mdc` | No daily ship nag |
| Workspace: locked PTT/video files | Do not touch |

If any action fights these → **the rules win**.

---

## Record

| Item | Result |
|------|--------|
| User | Rules = life and death; agent failed |
| Agent | Must re-check rules before every edit |
| Login Brand Primary bug | Fixed; see `MOB-DISC-LOGIN-BRAND-PRIMARY-BUG.md` |

---

## Related

- `MOB-DISC-NO-SILENT-CHANGE.md`  
- `MOB-DISC-BRAND-AXIOM-NOT-C2.md`  
- `MOB-DISC-NO-WSL-172-AS-SERVER-IP.md`  
- `MOB-DISC-LOGIN-BRAND-PRIMARY-BUG.md`  
