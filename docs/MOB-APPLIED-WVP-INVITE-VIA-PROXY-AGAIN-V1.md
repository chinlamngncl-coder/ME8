# MOB-APPLIED: mob-wvp-invite-via-proxy-again-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**Paper:** `MOB-DISC-INVITE-NAT-TRACE-GOOGLE-3STEPS-20260717.md`  
**Supersedes for INVITE target:** `mob-wvp-hostaddress-real-lan-v1` (Docker-direct timed out)

## Change

| Piece | Value |
|-------|--------|
| WVP `hostAddress` | **PC `192.168.1.38:5060`** (SIP proxy) |
| Real BWC LAN | **Map only** — Chin `.131:46133` · kk `.132:33881` |
| INVITE path | WVP → host `:5060` → proxy relay → cam |
| REGISTER | Unchanged (cam → `:5060` → `:15061`) |
| BWC typing | **No change** — still PC IP · **5060** |

## Files

- `lib/wvpLabClient.js` — `updateDeviceInviteRoute` / sync / ensure ready → proxy signal  
- `scripts/wvp-sip-lan-proxy.js` — log `INVITE forwarded to BWC`  
- Proxy restarted; logs → `storage/wvp-sip-lan-proxy.out.log` (INVITE relay lines)

## Verified after APPLY

- DB host = `192.168.1.38:5060` for both cams  
- Map still has real LAN  
- Channels still **1** each  

## Operator

1. **Restart Fleet** (loads new invite-route code).  
2. Soft Open Chin then kk.  
3. Pass: real video + fleet.log `live broker wvp-zlm primary`  
4. Also check `storage/wvp-sip-lan-proxy.out.log` for `invite relay → cam` / `INVITE forwarded to BWC`  

Fail still `消息超时未回复` / no relay line → proxy not seeing INVITE (next diagnose).

## One line

**INVITE goes WVP → PC:5060 proxy → real cam LAN again — Soft Open to prove picture.**
