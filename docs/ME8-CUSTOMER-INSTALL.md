# ME8 — customer & operator install guide

**MOB:** `mob-me8-customer-install-story`  
**Audience:** Site super admin and dispatch operators — **browser only**  
**Not for:** PowerShell, Docker, or server folders

Your Ubitron partner or IT installer completes server setup **before** you open this guide.

---

## 1. Open the dashboard

Use the URL on your handoff sheet, for example:

`http://<server-ip>:3988`

If your organisation uses HTTPS, IT will give you an `https://` address on the handoff sheet instead.

Supported browsers: Chrome, Edge (current version).

---

## 2. First login

| Field | Value |
|-------|--------|
| Username | `global` |
| Password | `global123` |

You must **change the password** on first login. The default password stops working after that.

---

## 3. Super-admin setup (once)

Complete these in order:

1. **New password** — follow the on-screen rules (length and character types).
2. **Two-factor authentication** — scan the QR code with your authenticator app; keep backup codes in a safe place.
3. **Settings → Server Config**

| Task | Where | Notes |
|------|--------|--------|
| Server / network address | Deployment / network section | LAN IP or hostname operators use |
| FTP password | Evidence / FTP section | Save once; field shows **Password saved** |
| SIP password | Protocol (SIP) section | Same on every body-worn camera |
| Body-worn cameras | BWCs tab | Device IDs from your fleet |
| Operators | Dashboard → Operators | Assign roles; not everyone is super admin |

**Password fields:** leave blank to keep the current password. Type a new value only to change it. Status **Password saved** means the server has a secret stored.

---

## 4. Configure body-worn cameras

Use the values from **Settings → Server Config** (SIP server, port, realm, passwords) on each device’s network menu.

Device IDs and operator names come from your BWC list in Settings.

---

## 5. Daily use

| Task | Menu |
|------|------|
| Live map & GPS | Map |
| Live video wall | Operations |
| SOS | Map / alerts |
| Push-to-talk | Operations / map |
| Evidence | Evidence hub |

Sign out when finished on shared PCs.

---

## 6. What you should never need to do

| Do not | Why |
|--------|-----|
| Edit files under `storage/` or run install scripts | Partner / IT only |
| Run engineering verify tools | Ubitron pre-ship checks only |
| Install Docker or extra programs | Not part of operator setup |
| Open LAB / Diagnostics tabs | Engineer support only |

If something fails, contact your **Ubitron partner** or **site IT** — describe what you clicked and what you saw.

**Locked out of login (forgot password or authenticator):** you cannot fix this in the browser. Call your **Ubitron partner** — they run ship recovery on the server. See [ME8-SUPER-ADMIN-RECOVERY.md](./ME8-SUPER-ADMIN-RECOVERY.md) (partner / IT only).

---

## 7. Optional reading (IT)

HTTPS in front of the dashboard: [ME8-TLS-IT-APPENDIX.md](./ME8-TLS-IT-APPENDIX.md) (customer IT only — not operator steps).

---

**Installer steps:** [ME8-INSTALLER-RUNBOOK.md](./ME8-INSTALLER-RUNBOOK.md) (Ubitron / partner only)
