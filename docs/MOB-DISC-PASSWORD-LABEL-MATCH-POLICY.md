# MOB DISC — Password UI vs policy (Set password min 8 vs 12)

**Status:** Merged & **APPLIED** via `MOB-DISC-PASSWORD-UNIFY-12-EXAMPLE-HINT.md` (2026-07-08).  
**Symptom (historical):** Label **“New password (min 8)”**; server error **“Password must be at least 12 characters”**.  
**Root cause:** Static i18n left at old **min 8**; policy was operator 12 / super_admin 14.

---

## Why this keeps coming back

| Layer | Truth |
|-------|--------|
| Server validate | 12 / 14 + complexity — authoritative |
| `auth.passwordPolicy.hint` | Correct (min + specials) — used on some change-password screens |
| Labels `server.users.newPassword` / `server.users.password` | Still say **(min 8)** — **lie** |
| Reset dialog | Hardcoded minLength / no dynamic label |

This is not a new policy invention — it is **label drift** after the policy was raised. Fix once with **one source of truth**.

---

## Locked fix (when APPLY)

**MOB name:** `mob-password-label-match-policy`  
**Risk:** 1 (UI + i18n only)

1. Stop baking “min 8” into labels.  
2. On open Set password / Add user: load policy for **target role** → set label to real min + short complexity (or point at shared `auth.passwordPolicy.hint`).  
3. `minLength` attribute = same number.  
4. Same for create-user password field.  
5. Never show a length that the API will reject.

**Not in this MOB:** changing 12→8 again (weakens ship posture). If you want softer lab passwords, that is a separate DISC.

---

## Reply to apply

`MOB-APPLY mob-password-label-match-policy`
