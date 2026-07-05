# ME8 — internal ship desk (Ubitron only)

**Audience:** Ubitron engineering and ship desk — **not** partners, customers, or operators  
**Handoff docs:** [CUSTOMER-START.txt](../CUSTOMER-START.txt), [ME8-CUSTOMER-INSTALL.md](./ME8-CUSTOMER-INSTALL.md), [ME8-INSTALLER-RUNBOOK.md](./ME8-INSTALLER-RUNBOOK.md)

This document may reference bootstrap files and verify scripts. **Never copy these sections into customer or partner PDFs.**

---

## Build customer pack

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\BUILD-ME8-CUSTOMER.ps1 `
  -OutRoot "C:\ME8-Ship\CustomerName" `
  -CustomerName "Customer Name" `
  -LanIp "10.0.0.50" `
  -LicensePath "path\to\platform-license.json"
```

Ship desk automation (not a human checklist):

- Stage application tree (no lab `storage/`)
- Factory `storage/` template + site license
- Bootstrap server profile (internal file under app root — operators use Settings only)
- `npm install --omit=dev` on staged tree (dependencies ship **in the pack**)
- `VERIFY-ME8-FRESH.ps1` — must PASS before zip leaves Ubitron
- Optional zip

See also [LICENSE-OPERATIONS.md](./LICENSE-OPERATIONS.md).

---

## Verify before handoff

| Check | Action |
|-------|--------|
| Fresh pack | `.\VERIFY-ME8-FRESH.ps1 -AppRoot <staged pack>` |
| Secrets crypto | `node scripts\test-secrets-at-rest.js` |
| Secrets ACL | `.\LOCK-SECRETS-ACL.ps1 -AppRoot <staged pack>` |
| Lab leftovers | No bench BWCs, operators, or trial ports in staged `storage/` |

---

## Bootstrap / engineering notes

| Item | Purpose |
|------|---------|
| Bootstrap profile file | Ports, generated FTP/SIP bootstrap values — migrated to encrypted vault on first Fleet start |
| `FM_SECRETS_MASTER_KEY` | Optional customer-supplied key — rare; default Windows DPAPI |
| VERIFY checks for lab env keys | Ensures trial defaults (`FM_FTP_PASS=000099`, seeded BWC) never ship |

**Super admin locked out:** `.\RESET-SUPER-ADMIN-RECOVERY.ps1 -List` then `-ResetTotp` or `-ResetAll` — [ME8-SUPER-ADMIN-RECOVERY.md](./ME8-SUPER-ADMIN-RECOVERY.md).

Partners and customers are **not** trained on these mechanisms.

---

## Partner receives

- Zip or folder from BUILD (includes `node_modules/`)
- **`HANDOFF-SHEET.txt`** — operator URL (http LAN default or https when `-OperatorHttpsUrl` set)
- [CUSTOMER-START.txt](../CUSTOMER-START.txt)
- Optional: [ME8-INSTALLER-RUNBOOK.md](./ME8-INSTALLER-RUNBOOK.md) partner section only
- Optional HTTPS: [ME8-TLS-IT-APPENDIX.md](./ME8-TLS-IT-APPENDIX.md) for customer IT

---

## TLS bench verify (before `me8-v1` lock)

Ubitron only — not partner or customer:

```powershell
.\SETUP-TLS-DASHBOARD.ps1 -SetOperatorUrl
.\RESTART-FLEET.bat
# second window: node scripts\me8-ship\me8-tls-proxy.js  (port 3443)
.\VERIFY-TLS-DASHBOARD.ps1 -BaseUrl https://127.0.0.1:3443
```

Record PASS in ship file. See [ME8-TLS-DASHBOARD.md](./ME8-TLS-DASHBOARD.md).

---

## Renewal

Replace `storage\platform-license.json` or ship new BUILD pack → partner runs `SETUP-ME8.bat` again.
