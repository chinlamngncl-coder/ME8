# MOB DISC — Login factory password hint (never for returning users)

**Status:** **APPLIED 2026-07-12** — `mob-login-factory-hint-gate`  
**Search:** login hint, global123, First install, factory password, returning user, login-ui  
**APPLY name:** `mob-login-factory-hint-gate`

---

## Plain answer

**The line “First install: password is global123…” must not appear for lab / returning operators.**

| Audience | Hint |
|----------|------|
| Brand-new install (`global` still `mustChangePassword`) | **Show** |
| Lab ME8 / site that already changed password | **Hidden** (default) |

Showing it always was **dumb** — it confused operators, fought saved passwords, and made a working lab look like a broken factory install.

---

## Decision (locked — agent must remember)

1. Hint is **`hidden` by default** in `login.html`.
2. Unhide **only** when `GET /api/auth/login-ui` returns `showFactoryPasswordHint: true`.
3. Server truth: default install user `global` is active **and** `mustChangePassword === true`.
4. If the API fails → **stay hidden** (never flash factory text at lab).
5. Do **not** put factory password copy permanently visible on login for “helpfulness.”
6. Ship packs inherit this gate on next ME8-based pack — do not re-add always-on hint in manuals-only MOBs.

---

## Files touched (this APPLY)

| File | Change |
|------|--------|
| `public/login.html` | hint `hidden`; cache-bust `login.js` |
| `public/js/login.js` | fetch `/api/auth/login-ui`, unhide only if true |
| `lib/dashboardAuth.js` | `getLoginUiPublicHints()` + public path |
| `server.js` | `GET /api/auth/login-ui` |

---

## Not in this MOB

- Restoring lab passwords / killing port zombies (separate discs)
- must-change-password page example (`Ab12cd34!@#$`) — that page is only for users who **must** change

---

## Record

| Item | Result |
|------|--------|
| User complaint | Hint on ME8 for existing user = unprofessional |
| Cause | Always-visible ship copy |
| Fix | Gate on `mustChangePassword` for `global` |
| Agent memory | Cursor rule `me8-login-factory-hint.mdc` + this disc |

---

## Related

- `docs/MOB-DISC-LAB-VS-TEST2-PORT-MERRY-GO-ROUND.md`  
- `docs/MOB-DISC-SHIP-REMINDERS-NO-NAG.md`  
- Pre-ship: factory hint OK **inside** first-install path / Migration guide — **not** permanent login chrome for all sites  
