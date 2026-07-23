# MOB-APPLIED — WVP SIP proxy listen :5060 restart (2026-07-19)

**APPLY:** `MOB-APPLY-WVP-SIP-PROXY-LISTEN-5060-RESTART`

## What changed

| Item | Before | After |
|------|--------|--------|
| `.env` `WVP_SIP_PROXY_LISTEN` | `0` (direct WVP bind) | **`5060`** |
| `docker-compose.wvp.yml` SIP publish | `5060:5060` | **`15061:5060`** |
| Host `:5060` | Docker WVP | **Node `wvp-sip-lan-proxy`** |
| Host `:15061` | (unused / old) | Docker WVP SIP |

Path again:

```text
BWC → LAN:5060 → wvp-sip-lan-proxy → 127.0.0.1:15061 (me8-wvp)
```

Alarm bridge target in proxy log: `127.0.0.1:3988/api/lab/wvp/device-alarm`

## Prove (lab)

- Proxy pid running `wvp-sip-lan-proxy.js`
- Log: `UDP listen 5060` / `TCP listen 5060` → `127.0.0.1:15061`
- `REGISTER/tcp` from BWC peer seen after bounce

## Note

Proxy may log `sync err wvp.syncLanSourceIps is not a function` — LAN sync helper export gap; **does not block** REGISTER / Alarm bridge. Separate MOB if you want that sync quieted.

## You

1. Hard refresh Ops if needed.  
2. Cold SOS on WVP-home cam → Ops SOS banner (Alarm via proxy → ME8).  
3. Keep Fleet SIP **:5062** / PTT **:29201** as before.
