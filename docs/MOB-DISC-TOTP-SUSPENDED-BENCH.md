# MOB DISC — TOTP suspended on bench

**Status:** **ON** for ME8 lab testing — password only, no authenticator step.  
**Search:** `TOTP`, `authenticator`, `FM_TOTP_SUSPENDED`, `login`

---

## Why (operator)

Cursor / agent passes break the bench often → restart, restore, log in again. TOTP at every login is too much during **testing**.

**Before customer ship:** TOTP goes back **on**. Non-negotiable (see `docs/ME8-SECURITY-BASELINE.md`).  
**Agent:** Do **not** daily-nag. Remind only at **ship packing** (`MOB-DISC-SHIP-REMINDERS-NO-NAG.md`).

---

## What it does

When `FM_TOTP_SUSPENDED=1` in `.env`:

- Super admin signs in with **username + password only**
- No 6-digit authenticator step
- No forced trip to **enroll authenticator** page

TOTP code stays in the product — just **paused** on this bench.

---

## Operator does nothing

Agent sets `.env` and restarts Fleet. You only log in with password.

---

## Before ship (builder / agent checklist)

| Step | Action |
|------|--------|
| 1 | Remove `FM_TOTP_SUSPENDED=1` from customer `.env` (or set `0`) |
| 2 | `RESTART-FLEET.bat` |
| 3 | Super admin: enroll authenticator + login with TOTP |
| 4 | `docs/ME8-SECURITY-BASELINE.md` — tick TOTP items |
| 5 | `docs/google-feedback-discussion/05-REVIEW-GATE-BEFORE-SHIP.md` |

**Ship with TOTP suspended = FAIL gate.**

---

## Technical (agents)

- Switch: `lib/dashboardTotp.js` → `isTotpSuspended()`
- Env: `FM_TOTP_SUSPENDED=1`
- Does not delete enrolled secrets on user record — turning flag off restores normal TOTP behaviour

---

## Related

- `docs/ME8-SECURITY-BASELINE.md` — production TOTP requirement  
- `MOB-DISC-START-HERE.md`
