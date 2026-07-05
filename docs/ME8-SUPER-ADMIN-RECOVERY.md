# ME8 — super admin recovery (locked out of 2FA)

**MOB:** `mob-me8-super-admin-recovery`  
**Audience:** Ubitron ship desk and site **partner / IT only** — not operators or designers

---

## When to use

Super admin knows the **password** but lost the **authenticator app** and **all backup codes**, or forgot both.

Operators do **not** edit `.env`, `storage/`, or run these scripts. They call the partner.

---

## Before ship (prevention)

| Step | Who |
|------|-----|
| Save the **8 backup codes** shown at first TOTP enroll (print / IT vault) | Customer IT |
| Create a **second super admin** while someone is still signed in | Customer IT |
| Handoff sheet: “Locked out → call [partner phone]” | Ubitron partner |

---

## Partner break-glass (on the dispatch PC)

1. Open PowerShell on the **same machine** that runs Fleet.
2. Go to the ME8 install folder (example: `C:\Ubitron-ME8\`).
3. List accounts:

```powershell
.\RESET-SUPER-ADMIN-RECOVERY.ps1 -List
```

4. **Lost authenticator only** (password still known):

```powershell
.\RESET-SUPER-ADMIN-RECOVERY.ps1 -Username global -ResetTotp
```

Admin signs in with password → enrolls a **new** QR code → saves **new** backup codes.

5. **Forgot password and authenticator**:

```powershell
.\RESET-SUPER-ADMIN-RECOVERY.ps1 -Username global -ResetAll -TempPassword "YourTempPass2026!x"
```

Give the temp password once by phone or in person. Admin must **change password** and **re-enroll TOTP** on first login.

Type **YES** when prompted (or add `-Yes` for automation).

---

## While another super admin is still signed in

Settings → Server Config → Operators — use **Reset password** for the locked colleague.

For authenticator only: super admin API `POST /api/users/:id/totp-reset` (reverify password). UI button may follow in a later MOB.

---

## Audit

Every CLI reset writes to the compliance audit log (`user.totp_reset`, `user.password_recovery`).

---

## Related

| Doc | Use |
|-----|-----|
| [ME8-SECURITY-BASELINE.md](./ME8-SECURITY-BASELINE.md) | TOTP policy at install |
| [ME8-CUSTOMER-INSTALL.md](./ME8-CUSTOMER-INSTALL.md) | Operator-facing — call partner if locked out |
| [ME8-INTERNAL-SHIP-DESK.md](./ME8-INTERNAL-SHIP-DESK.md) | Ship desk tools |
