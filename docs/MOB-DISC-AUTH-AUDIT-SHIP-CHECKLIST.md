# MOB DISC — Auth & audit ship checklist (partner / builder only)

**Status:** Product UI **removed** 2026-07-09 (option C). Checklist is **not** shown in Settings.  
**Search:** `auth audit ship`, `TOTP suspended`, `before ship`, `FM_TOTP_SUSPENDED`

---

## Who this is for

| Audience | Use |
|----------|-----|
| **You / partner / installer** | Before customer go-live |
| **Dispatch operators** | Never — not in the app |

---

## Before customer ship (tick all)

| # | Check | Pass when |
|---|--------|-----------|
| 1 | **Authenticator (TOTP)** | `FM_TOTP_SUSPENDED` **removed** from customer `.env` (or `0`). Super admin enrolled authenticator. Bench may keep `=1`. |
| 2 | **Outbound email (SMTP)** | Settings → Server Config → Dashboard Auth → SMTP host + from address set; test email OK if recovery needed. |
| 3 | **Recovery email** | Super admin → My account → recovery email **verified**. |
| 4 | **IT administrator PIN** | Dashboard Auth → IT administrator PIN set; **different** from login password. |
| 5 | **Audit trail** | Open Audit trail → list loads → CSV export works. |

**Ship with TOTP still suspended = FAIL.** See `MOB-DISC-TOTP-SUSPENDED-BENCH.md`.

---

## Optional agent check (not for operators)

With Fleet running and a super-admin session cookie:

`GET /api/auth-audit-ship-checklist`

Returns the same five rows as JSON. **Do not** put this panel back in the customer UI without ship-grade copy.

---

## Related

- `docs/MOB-DISC-TOTP-SUSPENDED-BENCH.md`
- `docs/ME8-SECURITY-BASELINE.md`
- IT PIN: Dashboard Auth → Set / reset PIN
