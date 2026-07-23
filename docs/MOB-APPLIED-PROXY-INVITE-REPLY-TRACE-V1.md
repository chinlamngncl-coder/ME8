# MOB-APPLIED: mob-proxy-invite-reply-trace-v1

**Date:** 2026-07-17  
**Status:** APPLIED (Google Soft Open pack MOB 3/3)  
**Depends on:** MOB 1 + MOB 2 (clean single INVITE)

## Mandate

Log cam **200 OK** (and INVITE error replies) as they pass host SIP proxy → WVP `:15061`.

## What changed

| Piece | Change |
|-------|--------|
| `scripts/wvp-sip-lan-proxy.js` | Parse SIP status · log `200 OK from cam → WVP` + `200 OK forwarded to WVP` · also non-200 INVITE replies |

Log file: `storage/wvp-sip-lan-proxy.out.log`

## Operator

**Restart the SIP proxy** (code change only loads on restart), then Soft Open once.

| Pass | Fail |
|------|------|
| Proxy: `INVITE forwarded to BWC` **and** `200 OK from cam → WVP` | INVITE forward only · no 200 |
| fleet.log: `live broker wvp-zlm primary` | Still timeout · no primary |

## One line

**Proxy now traces 200 OK reply path cam → WVP :15061.**
