# MOB DISC — Manuals V1: first sign-in default password (one-time only)

**Status:** **PASS / LOCKED 2026-07-28** — `MANUALS-V1-FIRST-LOGIN-PASSWORD-GATE-V1`  
**Search:** first login, default password, global123, must change password, factory install, one-time password, manuals first sign-in  
**APPLY name:** `MANUALS-V1-FIRST-LOGIN-PASSWORD-GATE-V1`

---

## Plain answer (locked)

On **first start** after a new install, Mobility Axiom ships with a **default super-admin account** (username **`global`**, install password **`global123`**).

That default password is **one-time use only**:

1. It works **only** while the account still requires the first password change (`mustChangePassword`).
2. After first sign-in, the system **forces** the user to the **Change your password** screen before normal dashboard use.
3. The user **cannot keep** the factory password — policy rejects reusing `global123` as the new password.
4. After the password is changed, **`global123` no longer works** for sign-in (even if someone tries it again).

**Mobility Axiom Manuals V1 (EN)** now document this in User, Quick Start, Tech, and the format standard. Do not revert sign-in sections to “dashboard opens immediately” without a named MOB.

---

## Locked product behavior (code truth)

| Fact | Source |
|------|--------|
| Default install user | `global` (`DEFAULT_USERNAME` in `lib/dashboardAuth.js`) |
| Default install password | `global123` (`DEFAULT_PASSWORD`) |
| First login with unchanged password | Login succeeds with `mustChangePassword: true` → redirect to `/must-change-password.html` |
| Cannot keep factory password | Change-password page: “You cannot keep that password.” (`public/must-change-password.html`) |
| Factory password blocked after change | `verifyLoginUser`: if password is `global123` and `mustChangePassword` is false → login rejected |
| Login hint for factory password | Shown **only** on true first install via `GET /api/auth/login-ui` → `showFactoryPasswordHint: true` (see `MOB-DISC-LOGIN-FACTORY-HINT-GATE.md`) |
| Password rules on first change | At least 12 characters; upper, lower, number, symbol; type (do not paste) |

**Related locked rule:** Factory password must **not** appear as permanent login-page text for returning sites — only gated first-install hint. Manuals may document default credentials in **Installation / first-start** sections and Migration guides; they must **not** instruct operators to rely on `global123` after first change.

---

## Manual rule (locked — agent must remember)

Any **Mobility Axiom Manuals V1** document that describes sign-in and may be used on a **new install** must include:

1. **IMPORTANT — First sign-in (new install only)** — one-time `global` / `global123`, forced change, factory password invalid after change.
2. Step-by-step **Change your password** procedure (or cross-reference).
3. Common problems: stuck on change screen, `global123` rejected after change, no factory hint on returning sites.

Format standard: `Mobility Axiom Manuals V1/00 - Manual Format Standard.rtf` §6.1.

Future language packs (PH, KR, TH, ID, CN, etc.) inherit this rule when translated.

---

## Files updated (APPLY 2026-07-28)

| File | Result |
|------|--------|
| `Mobility Axiom Manuals V1/User/EN/User Manual.rtf` | §3 IMPORTANT + §3.1 Change Your Password + U-02a |
| `Mobility Axiom Manuals V1/User/EN/User Manual.md` | Backup draft in sync |
| `Mobility Axiom Manuals V1/Quick Start/EN/Quick Start Guide.rtf` | §3 IMPORTANT + steps 7–8 + Q-02a + §12.1 |
| `Mobility Axiom Manuals V1/Tech/EN/Technical Manual.rtf` | §7 IMPORTANT handoff + expanded verification + T-03a |
| `Mobility Axiom Manuals V1/00 - Manual Format Standard.rtf` | §6.1 First Sign-In Rule (mandatory) |

**Not in this MOB:** Product code (already implemented). Ship **Installation / Migration** guide under `Mobility Axiom Manuals V1/` when that genre opens — must repeat same first-sign-in block.

---

## Screenshot placeholders (staff insert later)

| ID | Where |
|----|--------|
| U-02a | User Manual — Change your password after first sign-in |
| Q-02a | Quick Start — Change your password, first install |
| T-03a | Technical Manual — First technical sign-in change-password |

---

## Operator test

| Step | Expected |
|------|----------|
| Fresh install / `global` with `mustChangePassword` | Sign in `global` / `global123` → **Change your password** (not dashboard) |
| Try new password = `global123` | Rejected |
| Valid new password | Dashboard on next login |
| Retry `global123` | Login rejected |
| Manual wording | Matches on-screen flow |

**Operator:** PASS confirmed 2026-07-28 (“good. done”).

---

## Record

| Item | Result |
|------|--------|
| User complaint | Manuals missed default username/password and one-time-only rule |
| Cause | Sign-in sections written for returning users only |
| Fix | IMPORTANT blocks + change-password steps in User / Quick Start / Tech / format standard |
| APPLY | 2026-07-28 |
| Operator PASS | 2026-07-28 |
| Related | `MOB-DISC-LOGIN-FACTORY-HINT-GATE.md`, `me8-login-factory-hint.mdc` |

---

## Agent must NOT

- Remove IMPORTANT first-sign-in blocks from EN manuals without named MOB.
- Describe first install as “sign in → dashboard” with no password-change step.
- Tell returning lab/customer sites to use `global123` after first change.
- Re-add always-visible factory password on login UI (separate locked MOB).
