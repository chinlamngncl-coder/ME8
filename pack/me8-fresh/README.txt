ME8 ship desk — internal quick reference (Ubitron only)
=========================================================

Do NOT copy lab storage/ from a dev bench to customers.

Full procedure: docs\ME8-INTERNAL-SHIP-DESK.md
Partner handoff: docs\ME8-INSTALLER-RUNBOOK.md
Operator sheet: CUSTOMER-START.txt

Ship desk build (ready-to-run pack):
  .\BUILD-ME8-CUSTOMER.ps1 -OutRoot ... -CustomerName ... -LanIp ... -LicensePath ...
  (factory storage, bootstrap profile, npm deps, verify — all at ship desk)

Partner on site:
  1. Copy Ubitron pack to C:\Ubitron-ME8\
  2. SETUP-ME8.bat
  3. CUSTOMER-START.txt + dashboard URL

Operators configure network, FTP, and SIP in Settings only.

First login for site admin: global / global123 — change immediately.

Pack staging (dev tree only):
  .\scripts\me8-ship\PACK-ME8-SKELETON.ps1 -AppRoot . -OutRoot C:\ME8-Ship-Staging

Trial delivery (:3888) stays on SaaS Mobility — not this path.
