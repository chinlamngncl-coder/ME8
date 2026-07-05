# ME8 security baseline — pre-ship SOP

**Tree:** `C:\Users\user\Desktop\Enterprise Mobility\ME8`  
**Dashboard:** `http://<HOST>:3988` default LAN; optional **`https://`** via IT reverse proxy — [ME8-TLS-IT-APPENDIX.md](./ME8-TLS-IT-APPENDIX.md)  
**MOB:** `mob-me8-security-baseline`  
**Audience:** Ubitron ship team + customer IT before handoff

Use this **after** auth/secrets MOBs and **before** customer delivery or `me8-v1` lock. Pair with [ME8-SMOKE-CHECKLIST.md](./ME8-SMOKE-CHECKLIST.md) (functional) and `.\VERIFY-ME8-FRESH.ps1` (no lab leftovers).

---

## 0. Golden rules (never break)

| Rule | Why |
|------|-----|
| **Never ship your dev `storage/` folder** | Lab BWCs, GPS cache, operators, and secrets must not go to customers |
| **Always ship a BUILD pack from Ubitron** | Partner runs `SETUP-ME8.bat` — no dev tree or lab `storage/` |
| **Run verify before handoff** | Ubitron ship desk only — see [ME8-INTERNAL-SHIP-DESK.md](./ME8-INTERNAL-SHIP-DESK.md) |
| **Super admin only** for server config, FTP, users, evidence paths | Operators use assigned permissions only |
| **Secrets are set once, never shown again** | Dashboard shows **Password saved** — leave field blank to keep; type new value only to change |

---

## 1. Fresh install (partner — not operators)

See **[ME8-INSTALLER-RUNBOOK.md](./ME8-INSTALLER-RUNBOOK.md)**. Operators use **[ME8-CUSTOMER-INSTALL.md](./ME8-CUSTOMER-INSTALL.md)** / `CUSTOMER-START.txt` only. Ubitron BUILD detail: **[ME8-INTERNAL-SHIP-DESK.md](./ME8-INTERNAL-SHIP-DESK.md)**.

| # | Step | Done? |
|---|------|-------|
| 1.1 | Ubitron: `BUILD-ME8-CUSTOMER.ps1` — verify PASS, zip to partner | ☐ |
| 1.2 | Partner: copy pack to server (e.g. `C:\Ubitron-ME8\`) | ☐ |
| 1.3 | Partner: **`SETUP-ME8.bat`** — leave window open | ☐ |
| 1.4 | Confirm dashboard at handoff URL (`http://<LAN-IP>:3988`) | ☐ |
| 1.5 | Hand off **`CUSTOMER-START.txt`** + same URL | ☐ |

**First login:** `global` / `global123` → forced password change → super admin TOTP enroll → dashboard.

---

## 2. Account and login policy

| Control | ME8 behaviour |
|---------|----------------|
| Default install password | `global123` works **once**; blocked after change |
| Password rules | Operators **12+** chars; super admin **14+**; upper, lower, digit, special |
| Password history | Last **5** passwords cannot be reused |
| Paste on auth fields | Blocked on login and password-change forms |
| Super admin TOTP | **Required** — offline authenticator app (6-digit code at login) |
| Operator TOTP | Optional (not forced in v1) |
| Session | Cookie-based; sign out clears client reverify token |

**IT action:** Create operator accounts in **Settings → Server Config → Dashboard → Operators**. Assign groups and permissions — not super admin unless needed.

**Locked out (lost authenticator + backup codes):** Partner runs `.\RESET-SUPER-ADMIN-RECOVERY.ps1` on the dispatch PC — [ME8-SUPER-ADMIN-RECOVERY.md](./ME8-SUPER-ADMIN-RECOVERY.md). Operators never edit `.env` or `storage/`.

---

## 3. Secrets — where they live

| Item | On disk | In API / UI |
|------|---------|-------------|
| SIP register password / alt | `storage/secrets/server-secrets.json` (encrypted) | Never returned — `passwordConfigured` only |
| FTP ingest password | Same vault | Never returned |
| ONVIF / BWC registration passwords | Same vault | Never returned |
| Server settings (non-secret) | `storage/server-settings.json` | Public view — **no password fields** |
| Vault encryption key | `storage/secrets/vault-key.dpapi` (Windows DPAPI) or optional customer master key (ship desk) | Never in UI |
| Operator password hashes | `storage/dashboard-users.json` | Never returned |
| Bootstrap server profile | Ship desk only — first Fleet start migrates SIP/FTP into vault | **Operators use Settings only** |

**Honest limit:** A Windows admin on the **same server** who can run as the Fleet user can decrypt DPAPI and read the vault. Encryption stops casual file browsing and unsafe backup copies — not a determined host admin.

---

## 4. Change FTP password (super admin)

| Step | Action |
|------|--------|
| 1 | Log in as **super admin** (password + authenticator) |
| 2 | Open **Evidence & Docking → Storage** |
| 3 | Scroll to the **FTP** block (host, port, username) |
| 4 | Status badges show **Running** / **Configured** — labels only |
| 5 | Type new password in **FTP password** (empty box = already configured) |
| 6 | Click **Save FTP settings** (in the FTP block) |
| 7 | Set the **same** password on each BWC / dock FTP screen |

Re-enter your sign-in password if prompted (reverify gate).

---

## 5. Change SIP password (super admin)

| Step | Action |
|------|--------|
| 1 | Log in as **super admin** |
| 2 | **Settings → Server Config** → confirm password gate |
| 3 | Open **SIP** tab |
| 4 | Type in **SIP register password** / **Alt SIP password** (fields stay empty after save) |
| 5 | Click **Save server settings** |
| 6 | Align BWC SIP credentials with the new value |

---

## 6. Dangerous changes — password reverify

After opening Server Config, a **5-minute reverify token** is issued. These saves require a valid token or typing your password again:

- Server settings (SIP, network, deployment)
- FTP settings
- Evidence / storage paths
- User create, edit, deactivate, password reset
- Dispatch group save / delete / CSV import
- Cloud deployment settings

Exports, case delete, USB maintenance, and secure export approve/deny already require super admin password per action.

---

## 7. Network and host hardening (customer IT)

| # | Check | Done? |
|---|-------|-------|
| 7.1 | Fleet PC on trusted LAN / VLAN; not directly on public internet without edge firewall | ☐ |
| 7.2 | Windows Firewall allows only required ports (see Server Config → firewall checklist) | ☐ |
| 7.3 | RDP / SMB restricted to admin jump hosts if remote support needed | ☐ |
| 7.4 | Dedicated service or admin account runs Fleet — not shared kiosk user | ☐ |
| 7.5 | `storage/secrets/` ACL locked (`.\LOCK-SECRETS-ACL.ps1`) | ☐ |
| 7.6 | **HTTPS operator URL** (optional IT) — reverse proxy to `:3988`; operator login URL `https://…` in Settings; Ubitron bench `VERIFY-TLS-DASHBOARD.ps1` PASS | ☐ |
| 7.7 | Antivirus excludes high-churn evidence paths if performance requires (document exception) | ☐ |
| 7.8 | Backups: include `storage/` for ops continuity; treat backup media as **confidential** | ☐ |

**Ports (default ME8):** HTTP **3988**, video WS **3989**, SIP **5060**, FTP **21** + passive range, PTT **29201**, BWC message WS **6000** — confirm in Server Config for this site.

---

## 8. Pre-handoff verification

Ubitron ship desk only — see [ME8-INTERNAL-SHIP-DESK.md](./ME8-INTERNAL-SHIP-DESK.md):

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\scripts\me8-ship\VERIFY-ME8-FRESH.ps1 -AppRoot <staged pack>
```

Confirm output includes:

- `bwc-devices.json empty` (no lab fleet)
- `dashboard-users.json` has no lab operators (`ncl`, `nn`, `test`)
- `server-settings.json has no inline passwords`
- `server-secrets.json encrypted at rest` (after first Fleet start)
- `operatorUrl` matches `:3988` (not trial `:3888`)
- No trial FTP default or seeded BWC in bootstrap profile

Optional crypto smoke:

```powershell
node scripts\test-secrets-at-rest.js
.\LOCK-SECRETS-ACL.ps1
```

**Lab bench verify (`mob-me8-aes256-verify`, 2026-07-04):** PASS — smoke test OK; live vault `format: me8-secrets-v2`, `cipher: aes-256-gcm`; NTFS ACL locked (`SYSTEM`, `Administrators`, service user); `/api/server-settings` returns `passwordConfigured` flags only (no plaintext). Settings UI shows **Password saved** when secrets are stored (`server.secrets.configured`).

---

## 9. What we do **not** claim (v1)

- Multi-tenant SaaS isolation
- HSM / cloud KMS integration (use `FM_SECRETS_MASTER_KEY` if customer supplies key management)
- Encrypted evidence files at rest on FTP/NAS (catalog + access control only)
- Automatic penetration test or SOC2 — customer runs their own assessment

---

## Sign-off

| Result | |
|--------|---|
| Sections **0–8** reviewed and passed on customer server | ☐ |
| `VERIFY-ME8-FRESH.ps1` OK | ☐ |
| Super admin password changed + TOTP enrolled | ☐ |
| FTP/SIP passwords set and not default | ☐ |
| **Signed off by:** | _______________ |
| **Customer / site:** | _______________ |
| **Date:** | _______________ |

**Next:** Phase A functional smoke [ME8-SMOKE-CHECKLIST.md](./ME8-SMOKE-CHECKLIST.md), then Phase B enterprise MOBs per [ME8-ROADMAP.md](./ME8-ROADMAP.md).

---

## Quick paste template

```text
ME8-SECURITY
fresh-install: ok / fail —
verify-fresh: ok / fail —
password-changed: ok / fail —
totp-enrolled: ok / fail —
ftp-configured: ok / fail —
sip-configured: ok / fail —
secrets-encrypted: ok / fail —
blockers:
```
