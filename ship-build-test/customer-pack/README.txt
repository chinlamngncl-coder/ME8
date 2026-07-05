Ubitron ME8 — commercial pack skeleton
======================================

NOT a trial delivery pack (trial stays on SaaS Mobility :3888).
ME8 listens on :3988 by default.

INSTALL (customer server)
  1. Copy this folder to e.g. C:\Ubitron-ME8\
  2. npm install   (Node 18+ required — skeleton does not bundle Node yet)
  3. Run NEW-ME8-INSTALL.ps1  (factory storage + .env from template)
  4. Open Settings → Server Config — set site network, FTP, and SIP (not .env)
  5. RESTART-FLEET.bat
  6. VERIFY-ME8-FRESH.ps1  (must pass before handoff)

First login: global / global123 — change super-admin password immediately.

See ME8-FRESH-INSTALL.txt for detail.
