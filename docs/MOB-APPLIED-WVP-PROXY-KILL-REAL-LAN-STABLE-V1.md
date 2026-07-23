# MOB-APPLIED: kill zombie SIP proxy + keep real LAN hostAddress

**Date:** 2026-07-17  
**Status:** APPLIED (ops + code already on real-LAN path)  
**With:** `mob-wvp-hostaddress-real-lan-v1` · `mob-wvp-dedupe-channels-v1`

## Done

1. Killed old `wvp-sip-lan-proxy.js` (was reverting host to `192.168.1.38:5060`).  
2. Restarted proxy with current code (PID listening **5060**).  
3. Verified after sync + 12s: host stays  
   - Chin `192.168.1.131:46133`  
   - kk `192.168.1.132:33881`  
   Not PC `:5060`. Logs show **`wvp invite route real LAN`** only (no `via SIP proxy`).

## Soft Open after this

- TooManyResults: **gone**  
- Next fail seen on API prove: **`receive_stream_timeout` / 收流超时** — INVITE path ready, **no RTP into ZLM yet**  
- Operator: Soft Open + check BWC **TCP** transport (`MOB-DISC-BWC-TCP-TRANSPORT-HARDWARE-CHECK.md`)

## One line

**Zombie proxy killed; hostAddress stays real LAN; video now blocked on RTP/TCP receive, not duplicate channels.**
