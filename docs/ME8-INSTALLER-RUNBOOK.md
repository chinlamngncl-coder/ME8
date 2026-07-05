# ME8 — partner install (on site)

**MOB:** `mob-me8-customer-install-story`, `mob-me8-no-env-in-handoff`  
**Audience:** Certified partner or customer IT — **not** dispatch operators  
**Ubitron ship desk:** [ME8-INTERNAL-SHIP-DESK.md](./ME8-INTERNAL-SHIP-DESK.md) (internal only)

Ubitron delivers a **ready-to-run pack** (application, dependencies, and factory configuration already prepared at ship desk).

---

## On-site steps

| # | Step |
|---|------|
| 1 | Windows Server or Windows 10/11 Pro with **Node.js 18+** installed |
| 2 | Copy the Ubitron ME8 pack to e.g. `C:\Ubitron-ME8\` |
| 3 | Double-click **`SETUP-ME8.bat`** — leave the window open while the server runs |
| 4 | Confirm dashboard opens at the URL on **`HANDOFF-SHEET.txt`** (default `http://<server-ip>:3988`) |
| 5 | Give the site admin **`CUSTOMER-START.txt`**, **`HANDOFF-SHEET.txt`**, and the same URL |

That is the full server-side install for the default on-prem SKU.

---

## Handoff to site admin

| Item | Detail |
|------|--------|
| URL | From **`HANDOFF-SHEET.txt`** (Ubitron BUILD output) |
| First login | `global` / `global123` — must change immediately |
| Setup | Browser → Settings (network, FTP, SIP, devices, operators) |
| Guide | [ME8-CUSTOMER-INSTALL.md](./ME8-CUSTOMER-INSTALL.md) |

---

## Troubleshooting

| Symptom | Action |
|---------|--------|
| SETUP window closes or errors | Contact Ubitron support with `storage\fleet.log` |
| Port 3988 in use | Stop other Mobility/trial instance; retry SETUP |
| Dashboard unreachable | Windows Firewall — allow the app; confirm LAN IP on handoff sheet |
| SIP/FTP issues after login | Site admin completes Settings → Save (status **Password saved**) |

---

## Not part of partner install

| Item | Notes |
|------|--------|
| Docker / Valkey / Postgres | Not default v1 SKU |
| Engineering / verify scripts | Ubitron ship desk only |
| TLS | Optional — customer IT only: [ME8-TLS-IT-APPENDIX.md](./ME8-TLS-IT-APPENDIX.md) |

---

**Operators:** [ME8-CUSTOMER-INSTALL.md](./ME8-CUSTOMER-INSTALL.md)
