# MOB DISC — Track C TLS genre (plain)

**Date:** 2026-07-23  
**Status:** C1–C3 **APPLIED**; C4 optional  

| # | Name | Status |
|---|------|--------|
| C1 | `DASHBOARD-HTTPS-LAN-V1` | PASS |
| C2 | `WSS-VIDEO-AUDIO-SOCKETS-V1` | PASS |
| C3 | `SAME-ORIGIN-MEDIA-PROXY-V1` | APPLIED — operator verify |
| C4 | `TRUST-PROXY-AND-HOST-V1` | Next if you put nginx/Caddy in front |

AES + PTT pulse = other lists.

After C3 PASS, next optional:

```text
MOB-APPLY TRUST-PROXY-AND-HOST-V1
```

Or park TLS and do something else you name.
