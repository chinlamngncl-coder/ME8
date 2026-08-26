# MOB APPLIED — DASHBOARD-TLS-SAN-LAN-IP-V1

**Date:** 2026-08-22  
**Phrase:** `MOB-APPLY DASHBOARD-TLS-SAN-LAN-IP-V1`  
**Disc:** `docs/MOB-DISC-LAN-AUDIO-SECURE-CONTEXT-CERT-V1.md`

## What changed

`scripts/ensure-lab-dashboard-tls-certs.js`:

- Reads existing cert SAN (Node `X509Certificate`)
- **Auto-regenerates** when current preferred LAN IP (or other required hosts) are missing (DHCP drift) — boot `ensure` no longer skips a stale cert forever
- Prints client hint: use `https://<LAN>:4438`, not localhost on another PC
- Optional **`--trust-user`**: import lab cert into **CurrentUser Root** (this Windows profile only)

## Lab fact (this machine)

Preferred LAN: **192.168.1.38**. Cert SAN already included that IP before APPLY; APPLY still force-refreshed + offered trust.

## Operator verify

1. Restart Fleet.  
2. Open **`https://192.168.1.38:4438`** (not `:3988`).  
3. If warning: **Advanced → Continue**, or re-run  
   `node scripts/ensure-lab-dashboard-tls-certs.js --trust-user` then restart browser.  
4. Sign in → live → **unmute** + **mic**.  
5. **PASS** = talk/listen on that HTTPS URL. Localhost is lab-only.

If HTTPS+SAN+trusted still silent → next named MOB (PCM/`/ws/audio`), not more cert churn.
