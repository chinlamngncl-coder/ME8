# ME8 — HTTPS for operators (customer IT appendix)

**MOB:** `mob-me8-tls-ship-integrate`  
**Audience:** Customer IT — **not** dispatch operators or site admins in daily use  
**Default v1 SKU:** private LAN — operators use `http://<server-ip>:3988` from the handoff sheet

Use this appendix when IT policy requires **HTTPS** for the dashboard (internet-facing dispatch, compliance, or corporate browser policy).

---

## What operators see

| Scenario | Operator URL on handoff sheet |
|----------|------------------------------|
| LAN default (most sites) | `http://<server-ip>:3988` |
| IT terminates TLS | `https://dispatch.yourorg.com` (no `:3988` when using port 443) |

Operators open **one URL** in Chrome or Edge. They do not install nginx, certificates, or proxy software.

---

## Architecture

```
Operators ──HTTPS──► reverse proxy (:443)
                           │  X-Forwarded-Proto: https
                           ▼
                    Fleet HTTP :3988  (loopback or LAN)

Live video WebSocket ──ws://──► :3989  (LAN — not proxied in v1 default layout)
SIP / FTP / PTT ───────────────► unchanged
```

Fleet stays on HTTP **behind** the proxy. IT terminates TLS at the edge.

---

## IT setup steps

| # | Step |
|---|------|
| 1 | Install **nginx**, **Caddy**, or **IIS ARR** on the dispatch server (or dedicated edge host). |
| 2 | Copy a template from `scripts\me8-ship\templates\` and replace `DISPATCH_HOST` and certificate paths. |
| 3 | Point the proxy upstream to **`127.0.0.1:3988`** (recommended — do not expose plain HTTP to the internet). |
| 4 | Install a valid CA certificate (Let’s Encrypt, AD CS, commercial CA). |
| 5 | Open firewall **443/tcp** to the proxy. Keep **3989/tcp** (video WS) on the operator LAN only. |
| 6 | Site admin: **Settings → Server Config → Operator login URL** → set `https://dispatch.yourorg.com` → **Save**. |
| 7 | Confirm operators can sign in over HTTPS. |

When the operator login URL starts with **`https://`**, ME8 **automatically** trusts the reverse proxy (secure session cookies — no engineer PIN or extra toggle).

---

## Templates

| File | Use |
|------|-----|
| `scripts/me8-ship/templates/nginx-me8-dashboard.conf` | nginx on Linux or Windows |
| `scripts/me8-ship/templates/Caddyfile.me8` | Caddy (automatic HTTPS with real hostname) |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Login works on HTTP but not HTTPS | Confirm proxy sends `X-Forwarded-Proto: https`; set operator login URL to the same `https://` address |
| Certificate warning | Install a CA-trusted cert — self-signed certs are for Ubitron bench only |
| Live video black after HTTPS | Expected if `:3989` is blocked — open video WS port on operator LAN |
| `502` from proxy | Fleet not running — partner runs `SETUP-ME8.bat` |

---

## Out of scope for customer IT (Ubitron internal)

| Item | Notes |
|------|--------|
| Lab TLS on `:3443` | Ubitron bench verify only — [ME8-TLS-DASHBOARD.md](./ME8-TLS-DASHBOARD.md) internal section |
| `SETUP-TLS-DASHBOARD.ps1` | Ship desk / engineering — not customer install |
| `VERIFY-TLS-DASHBOARD.ps1` | Ubitron pre-ship gate — [ME8-INTERNAL-SHIP-DESK.md](./ME8-INTERNAL-SHIP-DESK.md) |

---

**Operators:** [ME8-CUSTOMER-INSTALL.md](./ME8-CUSTOMER-INSTALL.md)  
**Partner:** [ME8-INSTALLER-RUNBOOK.md](./ME8-INSTALLER-RUNBOOK.md)
