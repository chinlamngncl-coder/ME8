ME8 commercial fresh install — storage template
==========================================

Do NOT copy lab storage/ from a dev bench to customers.

Use on the customer server (or reset a lab bench to factory state):

  1. Stop Fleet (close RESTART-FLEET window).
  2. From ME8 root:
       .\NEW-ME8-INSTALL.ps1
     Optional: .\NEW-ME8-INSTALL.ps1 -LanIp 10.0.0.50
       (writes .env from template — operators never edit .env after handoff)
  3. Configure FTP, SIP, and users in Settings → Server Config.
  4. .\RESTART-FLEET.bat
  5. Verify:
       .\VERIFY-ME8-FRESH.ps1
  6. Security sign-off (IT):
       docs\ME8-SECURITY-BASELINE.md

First login: username global / password global123 — change in super-admin.

Pack staging (dev machine, no lab storage in output):

  .\scripts\me8-ship\PACK-ME8-SKELETON.ps1 -AppRoot . -OutRoot C:\ME8-Ship-Staging

Trial delivery pack (3888) stays on SaaS Mobility — not this path.
