# MOB-APPLIED 3-NETWORK-TIER-AUTOMATION-SECURE (2026-07-27)

## Defense-in-depth
1. **Env failsafe** — `lib/networkTierRuntime.js`: all tiers bind `0.0.0.0`; cloud/hybrid set `ME8_TRUST_PROXY=loopback, linklocal, uniquelocal`.
2. **OS firewall** — `lib/firewallIngress.js`: `lan` allows HTTP/HTTPS only from RFC 1918; wan/cloud/hybrid allow public; SETUP port stays localhost-only.
3. **Node software lock** — `server.js`: `lanSubnetLockMiddleware()` returns 403 for non-private `req.ip` when tier is `lan`.

## Files
- `lib/networkTierRuntime.js` (new)
- `lib/firewallIngress.js`
- `bin/me8-server.js`
- `server.js`

## Operator PASS
Save tier in Setup → restart full boot → console shows `Network tier: …` → LAN tier blocks public IP at app layer even if firewall disabled.
