# MOB DISC — super admin lockout recovery (enterprise)

**Status:** PARKED — design only. **Not built yet.**  
**Search:** `forgot password`, `TOTP recovery`, `lockout`, `email`, `break-glass`

---

## The problem (plain English)

Super admin forgets password, or loses phone **and** backup codes. Today there is **no proper recovery** — only bad options:

| Bad option | Why it is wrong for enterprise |
|------------|-------------------------------|
| Edit `.env` on server | Customer IT is not a Node shop; you said no |
| Restart Fleet / scripts | Operator is not tech |
| Ubitron flies on-site | Does not scale |
| Empty Settings box that “does nothing” | We have done this too often — **not acceptable** |

**Enterprise software** must give a **clear UI path** that works **without** server access.

---

## What professional products do

| Pattern | Who uses it | How it feels |
|---------|-------------|--------------|
| **Forgot password → email link** | Microsoft 365, Google Workspace, most SaaS | Login → “Forgot password?” → email → set new password |
| **SSO / OIDC** | Large enterprises | No local password — customer **Azure AD / Okta** resets access |
| **Second super admin** | On-prem ERP, police CAD | Admin B resets Admin A in **Users** screen |
| **One-time install recovery kit** | Appliances (firewall, NVR) | Sealed envelope from vendor at install — **single-use codes** |
| **Vendor support break-glass** | License-bound | Call vendor with contract ID → time-limited unlock code |
| **Authenticator recovery** | GitHub, AWS | Backup codes (we have) **or** email OTP **or** admin resets MFA in console |

**ME8 should combine:** email recovery + in-app admin reset + install kit + (later) OIDC — **not** `.env` or restart.

---

## What ME8 has today (gaps)

| Feature | Today |
|---------|--------|
| Login “Forgot password?” | **No** |
| Recovery email on super admin | **No** field |
| SMTP / send email from app | **No** product UI |
| Super admin resets another user password | **Yes** — Settings, but **must already be logged in** |
| TOTP backup codes | **Yes** — at enroll only; if lost, **stuck** |
| Reset someone’s TOTP without their phone | **No** |
| Bench `FM_TOTP_SUSPENDED=1` | Testing only — **not** customer recovery |

---

## Proposed product design (logical UI — not a dead box)

### A. One-time setup (first super admin)

After password change + authenticator enroll:

1. **“Add recovery email”** (required before ship)  
2. Send **Verify email** → click link → marked verified  
3. Show **“Save your backup codes”** (already have) + **“Print recovery kit”** (new — see D)

Stored: `recoveryEmail`, `recoveryEmailVerifiedAt` on user record (not in `.env`).

### B. Forgot password (login page)

1. Link: **Forgot password?**  
2. Enter **username** (not email on login — avoids account enumeration noise in v1: same message whether user exists)  
3. If verified recovery email exists → **Send reset link** (expires 30 min, one use)  
4. Page: **Set new password** (policy enforced)  
5. Then: **Sign in with new password** → TOTP step as usual  

**No SMTP configured?** Screen says: *“Email recovery is not set up. Contact your organization administrator or Ubitron support with your platform license ID.”* — not a blank error.

### C. Lost authenticator (login page — TOTP step)

1. Link: **Can’t use authenticator?**  
2. Enter username + password again (prove identity)  
3. Send **one-time code to recovery email** (6–8 digits, 10 min)  
4. Enter code → **single login**  
5. Dashboard banner: **“Re-register authenticator within 24 hours”** → guided enroll (new QR, new backup codes)  
6. Audit log: `auth.totp.recovery_email`

**Rate limit:** 3 emails / hour per user.

### D. Install recovery kit (ship — one pack)

At **`NEW-ME8-INSTALL`** or first super-admin enroll, generate **two single-use codes** (printed PDF in customer handoff packet):

| Code | Use |
|------|-----|
| **Password recovery** | Login page → “Use recovery kit” → enter code → set new password |
| **Authenticator reset** | After password login → enter second code → force new TOTP enroll |

Codes are **hashed on server**, shown **once**, work **once**, expire in 12 months if unused. Customer keeps paper in safe — **no server visit**.

### E. Logged-in super admin (Settings → Security → Administrators)

For each super admin row:

| Action | Flow |
|--------|------|
| **Reset password** | Confirm your password → set temp password **or** send reset email to their recovery email |
| **Reset authenticator** | Confirm your password → clears TOTP → user must enroll on next login |
| **Edit recovery email** | Sends verification to new address |

Requires **second super admin** account in production (ship checklist).

### F. SMTP (Settings → Platform → Email)

Super admin configures once (like FTP block — honest UI):

- SMTP host, port, TLS, from address, test **Send test email**  
- Status: **Configured / Not configured**  
- Without SMTP: kit codes (D) + second admin (E) still work; email paths (B)(C) show clear message  

**Not in `.env` for operator** — optional bootstrap in install script only; then **Settings owns it**.

### G. OIDC (already sketched in lab)

Customer with Microsoft / org SSO: password recovery is **their IT** — document in handoff, not our email flow.

---

## What we will NOT ship

- “Contact your administrator” with no workflow  
- Recovery that only works if `FM_TOTP_SUSPENDED=1`  
- Recovery that requires editing `dashboard-users.json`  
- Modal with one field and no success/error path  
- Email reset without **verified** recovery email on file  

---

## MOB genre (when you approve — order matters)

| MOB | Delivers |
|-----|----------|
| `mob-me8-auth-recovery-email-field` | Recovery email + verify flow at enroll |
| `mob-me8-auth-smtp-settings` | Settings UI + send mail + test button |
| `mob-me8-auth-forgot-password` | Login forgot password + reset link |
| `mob-me8-auth-totp-email-recovery` | Lost authenticator → email OTP → re-enroll banner |
| `mob-me8-auth-admin-reset-mfa` | Settings: super admin resets peer password/TOTP |
| `mob-me8-auth-recovery-kit` | Install PDF + login “recovery kit” path |
| `mob-me8-auth-recovery-i18n` | Six locales for all new strings |

**One MOB at a time.** Checkpoint: designer can complete full lockout recovery **without** `.env`, restart, or Docker.

---

## Ship gate (add to security baseline)

| ☐ | Item |
|---|------|
| ☐ | Recovery email verified for every super admin |
| ☐ | SMTP configured **or** recovery kit printed and vaulted |
| ☐ | Second super admin account exists |
| ☐ | Designer test: forgot password path end-to-end |
| ☐ | Designer test: lost phone path end-to-end |
| ☐ | `FM_TOTP_SUSPENDED` removed |

---

## Bench today

`FM_TOTP_SUSPENDED=1` — password only for **your** testing. **Not** customer recovery.

---

## Related

- `docs/MOB-DISC-TOTP-SUSPENDED-BENCH.md`  
- `docs/ME8-SECURITY-BASELINE.md`  
- `docs/google-feedback-discussion/05-REVIEW-GATE-BEFORE-SHIP.md`
