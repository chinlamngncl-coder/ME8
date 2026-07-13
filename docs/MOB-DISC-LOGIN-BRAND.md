# MOB DISC — Login brand (Ubitron Mobility C2, not old nickname)

**Status:** **APPLIED 2026-07-12** — `mob-login-brand` / `MOB-APPLY login-brand`  
**Search:** login brand, Axiom, Ubitron Mobility C2, sign-in wordmark  
**APPLY name:** `mob-login-brand`

---

## Plain answer

Sign-in path no longer shows the old **Axiom** nickname.

| Before | After |
|--------|--------|
| Mobility **Axiom** on login | **Mobility C2** next to Ubitron logo |
| Browser tab “Sign in — Mobility Axiom” | “Sign in — **Ubitron Mobility C2**” |

Same for change-password / authenticator / recovery email **page titles**.

---

## Scope (this MOB only)

- `login.html` wordmark + title  
- Auth funnel HTML titles  
- Locale keys: `login.*` brand + those document titles  

**Not in this MOB:** main dashboard header / live / map still may say Axiom until a later “app-wide brand” MOB (higher surface area).

---

## Files

- `public/login.html`  
- `public/must-change-password.html`, `enroll-totp.html`, `recovery-email.html`, `verify-recovery-email.html`  
- `public/locales/{en,fil,ko,id,th,zh}.json`

---

## Try

Hard-refresh `http://127.0.0.1:3988/login.html` — should see **Mobility C2**, not Axiom.

---

## Related

- `docs/MOB-DISC-NEXT-QUEUE-PLAIN.md` (#2)  
- Brand rule: Ubitron product naming  
