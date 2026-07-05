# ME8 dashboard TLS — internal reference

**MOB:** `mob-me8-tls-dashboard`, `mob-me8-tls-ship-integrate`  
**Fleet HTTP:** stays on `:3988` — **not replaced**  
**Customer IT:** [ME8-TLS-IT-APPENDIX.md](./ME8-TLS-IT-APPENDIX.md) (no lab scripts)

---

## Ship model (three layers)

| Layer | Who | URL | TLS |
|-------|-----|-----|-----|
| Fleet core | Always | `http://127.0.0.1:3988` or LAN `:3988` | None on Fleet itself |
| **Default v1 handoff** | Operators on private LAN | `http://<server-ip>:3988` on `HANDOFF-SHEET.txt` | Not required |
| **Optional HTTPS** | Customer IT + site admin | `https://dispatch.customer.com` | nginx / Caddy / IIS on `:443` |
| **Lab bench** | Ubitron only | `https://<LAN-IP>:3443` | Self-signed + `me8-tls-proxy.js` |

**Auto integration (`mob-me8-tls-ship-integrate`):** when site admin saves **Operator login URL** starting with `https://`, ME8 enables **trust reverse proxy** automatically — no LAB tab, no second customer process.

---

## Architecture

```
Operators ──HTTPS──► reverse proxy (:443 production, :3443 lab)
                           │  X-Forwarded-Proto: https
                           ▼
                    Fleet HTTP :3988

BWCs / JSMpeg ──ws://──► video WS :3989  (LAN — not proxied in v1)
SIP / FTP / PTT ────────► unchanged
```

---

## Ubitron bench verify (internal — not customer path)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\SETUP-TLS-DASHBOARD.ps1 -SetOperatorUrl
.\RESTART-FLEET.bat
```

New window — TLS proxy:

```powershell
$env:FM_TLS_LISTEN_PORT = '3443'
node scripts\me8-ship\me8-tls-proxy.js
```

Verify:

```powershell
.\VERIFY-TLS-DASHBOARD.ps1 -BaseUrl https://127.0.0.1:3443
```

Record PASS in ship file before `me8-v1` lock.

---

## Production (customer IT summary)

Full steps: **[ME8-TLS-IT-APPENDIX.md](./ME8-TLS-IT-APPENDIX.md)**

1. IT installs reverse proxy + CA cert on `:443`.
2. Upstream → `127.0.0.1:3988`.
3. Site admin sets **Operator login URL** to `https://…` in Settings → Save.
4. Trust proxy applies automatically; operators use the HTTPS handoff URL.

Templates: `scripts/me8-ship/templates/`

---

## Ship desk BUILD (optional HTTPS handoff)

```powershell
.\BUILD-ME8-CUSTOMER.ps1 `
  -OutRoot "C:\ME8-Ship\Customer" `
  -CustomerName "Customer Name" `
  -LanIp "10.0.0.50" `
  -LicensePath "...\platform-license.json" `
  -OperatorHttpsUrl "https://dispatch.customer.com"
```

Writes `HANDOFF-SHEET.txt` with the operator URL and pre-enables trust proxy in the staged pack.

Default (LAN): omit `-OperatorHttpsUrl` → handoff uses `http://<LanIp>:3988`.

---

## Checklist (sign-off)

| # | Check | Done? |
|---|--------|-------|
| T1 | Reverse proxy terminates TLS; upstream is Fleet `:3988` | ☐ |
| T2 | Operator login URL is `https://…` when HTTPS is used | ☐ |
| T3 | Trust proxy enabled (automatic when operator URL is https) | ☐ |
| T4 | Ubitron bench: `VERIFY-TLS-DASHBOARD.ps1` PASS | ☐ |
| T5 | Login over HTTPS; session cookie has **Secure** | ☐ |
| T6 | Live wall still works (video WS on LAN `:3989`) | ☐ |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Login works on HTTP but not HTTPS | Set operator login URL to the public `https://` address; confirm proxy sends `X-Forwarded-Proto: https` |
| Cookie missing **Secure** | Trust proxy must be on (auto when operator URL is https) |
| `502` from TLS proxy | Fleet not running — `SETUP-ME8.bat` |
| Live video black after HTTPS | Open `:3989` on operator LAN |

---

See also [ME8-SECURITY-BASELINE.md](./ME8-SECURITY-BASELINE.md) and [ME8-INTERNAL-SHIP-DESK.md](./ME8-INTERNAL-SHIP-DESK.md).
