# MOB DISC — `mob-me8-auth-smtp-settings` (UI placement + structure)

**Status:** DESIGN ONLY — **no code** until `MOB-APPLY mob-me8-auth-smtp-settings`  
**Scope:** **SMTP + test email only** — not forgot-password, not recovery email enroll (next MOBs)  
**Audience:** Super admin only  
**Search:** `smtp`, `email settings`, `Dashboard Auth`, `FTP pattern`

---

## Short answer: where it goes

| Put it here | Yes / No |
|-------------|----------|
| New top-level **Settings tab** called Email | **No** |
| New **Server Config** main tab (next to Network / BWC) | **No** |
| **Settings → Server Config → Dashboard Auth** — one **section** inside existing tab | **Yes** |
| First login / change-password page | **No** for SMTP (wrong — SMTP is platform, not personal) |
| First login for **recovery email** (your address) | **Later MOB** — not this one |

SMTP is like **FTP service config**: set once by super admin in Settings, not during password change.

---

## How ME8 already does it (follow this)

You already built a **pattern**. SMTP should **copy FTP**, not invent a new layout.

| Existing pattern | Where | Reuse for SMTP |
|------------------|--------|----------------|
| **FTP ingest block** | Evidence → Storage → `ev-ftp-settings-block` | Same grid, hints, badges, Save row |
| **Secrets** | Password field empty = keep; badge **Configured** | SMTP password same |
| **Server Config tabs** | Network, BWC, Groups, **Dashboard Auth**, … | SMTP lives under **Dashboard Auth** |
| **Super admin gate** | `canManageServer` — same as users table, voice alerts | SMTP hidden from operators |
| **Standalone auth pages** | `login.html` / `must-change-password.html` / `enroll-totp.html` — dark card, steps | **Not** for SMTP — only for personal recovery **later** |
| **Status badges** | `ev-st-badge` ok / muted on FTP service row | **Test email sent** / **Not configured** |

**Theme:** `#server-setup-panel` labels, `setup-hint`, `btn btn-action btn-sm`, slate dark fields — same as FTP and Dashboard Auth password block.

---

## UI structure (this MOB only)

**Path:** Settings → Server Config → **Dashboard Auth** tab

**Order on that tab (top → bottom):**

1. **Outbound email (SMTP)** ← **this MOB** (new `ss-config-section`, super admin only)  
2. Voice alerts (existing, super admin)  
3. Operators / My account subtabs (existing, unchanged)

### Block layout (mirror FTP)

```
h4  Outbound email (SMTP)
p   setup-hint  — Used for password reset and sign-in recovery (when enabled later). Configure once.

ev-ftp-form-grid  (reuse same CSS class names / grid)
  - SMTP host
  - Port (587 / 465)
  - Security: STARTTLS | SSL | None (select)
  - From address (display name + email)
  - Username (optional)
  - Password (password input, placeholder "Leave blank to keep current")
  - Row: badge "Password: Configured / Not set"
  - Row: badge "Last test: OK at … / Failed / Never tested"

ev-ftp-save-row
  - [Save SMTP settings]
  - [Send test email]  → sends to super admin's recovery email when that exists; until then, prompt for test address inline (one field, not a dead button)
  - span hint message (success/error — like ev-ftp-msg)
```

**No empty box.** Test email always does something: sends, or shows clear error (“Enter SMTP host”, “Save first”, “Mail server refused”).

### Read-only when not super admin

Same as FTP: operators never see this section.

---

## What NOT to do in this MOB

- Login page “Forgot password?”  
- Recovery email on enroll-totp  
- New main tab  
- `.env` for operator  
- Settings hub chip (optional later)  

---

## First login — what happens when (full picture, later MOBs)

For your question “during first log in?” — **split two things:**

| Item | When | MOB |
|------|------|-----|
| **SMTP server** (mail relay) | After install, super admin opens **Dashboard Auth** once | **This MOB** |
| **Your recovery email** (personal) | After password + TOTP enroll, **one more step** (same card style as `enroll-totp.html`) | **Next** — not smtp-settings |
| **Forgot password link** | Login page | **After** SMTP + recovery email exist |

**First-login chain (target, not built yet):**

```
Login → Change password → Enroll authenticator → Verify recovery email → Dashboard
```

SMTP is configured **before or after** that chain by installer/super admin in Settings — not on the enroll pages.

**Later:** super admin can change recovery email under Dashboard Auth → **My account** (super admin should get subtabs too, or a row in the SMTP section: “Your recovery email: verified@… [Change]”).

---

## Backend (for when MOB-APPLY — not now)

- Store SMTP in **server settings + secrets vault** (password like FTP), not `.env`  
- API: `GET/POST /api/platform/smtp` + `POST /api/platform/smtp/test`  
- Audit log on save and test  

---

## Files (when approved — single MOB)

| Area | Files |
|------|--------|
| UI | `public/index.html` (Dashboard Auth section only), `public/js/server-setup.js` or small `public/js/platform-smtp.js` |
| API | `server.js` routes + `lib/platformSmtp.js` |
| i18n | `public/locales/*.json` — six locales |
| **Do not touch** | `video-wall.js`, `liveStreamPool`, login flows (this MOB) |

---

## Ship reminder

SMTP required before customer enables TOTP recovery / forgot password. Add row to `ME8-SECURITY-BASELINE.md` when those MOBs land.

---

## Related

- `docs/MOB-DISC-SUPER-ADMIN-RECOVERY.md` — full recovery genre  
- `docs/MOB-DISC-TOTP-SUSPENDED-BENCH.md` — bench only  
