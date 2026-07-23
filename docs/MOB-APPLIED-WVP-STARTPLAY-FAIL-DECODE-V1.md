# MOB APPLIED — mob-wvp-startplay-fail-decode-v1

**Date:** 2026-07-17 ~00:44  
**Files:** `lib/wvpLabClient.js` · `lib/livePlaybackBroker.js` · `server.js`  
**API:** `GET /api/lab/wvp/diagnose-startplay?deviceId=`

---

## Decoded (live proof — not guess)

| Check | Result |
|-------|--------|
| ZLM media `status` | **true** (media-online holds) |
| Device `onLine` | **false** (chin + kk) |
| `hostAddress` / `ip` | **`172.21.0.1`** (Docker bridge) — **not** BWC LAN |
| startPlay msg | **收流超时** → ASCII `receive_stream_timeout` (also saw 消息超时未回复) |
| Wall today | Still fail-open Plan B — correct until this clears |

**Root:** WVP has **stale/offline** device rows pointing at Docker gateway. INVITE/stream cannot reach real cams on `192.168.1.x`.  
**Not** “no ZLM.” **Not** “give up.” **Not** “change all BWC off Fleet 5060.”

---

## Code change

- Decode Chinese → `msgKey` (ASCII) in startPlay errors + broker fallback log  
- Log `deviceOnline` / `hostAddress` / `dockerHostSuspect`  
- `diagnoseStartPlay()` + lab API for agent/Google

**You:** `RESTART-FLEET.bat` once so broker log uses new fields. Soft open → expect `msgKey: receive_stream_timeout` not `????`.

---

## Google paste (our checks)

```
ME8 WVP Plan A blocked AFTER ZLM media status:true.

Checks done:
1) GET /api/server/media_server/list → me8-zlm-modern status:true
2) GET /api/device/query/devices → 2 devices, onLine:false both
3) hostAddress/ip = 172.21.0.1:xxxxx (Docker bridge on me8-wvp_default) — NOT camera LAN
4) GET /api/play/start/{id}/{id} → code -2 msg 收流超时 (receive_stream_timeout);
   also seen code -1024 消息超时未回复
5) Fleet SIP 5060 must stay for daily ops. Soft wall fail-open = zlm-relay (mpeg pool) — res still bad.
6) Real BWC LAN last known ~192.168.1.78 / 192.168.1.128 (Fleet path).

Ask: With ZLM online, how should WVP store/refresh device remote host as real LAN IP so startPlay INVITE works, without moving the whole fleet off 5060? Stale 172.21.0.1 rows — delete + re-register one lab cam to WVP :5061, or another supported path (cascade / dual-register)?
```

---

## Concrete next (one)

**`mob-wvp-stale-docker-host-clear-reregister-v1`**

1. Clear/fix WVP device rows with Docker `172.x` host  
2. Get **one** cam registered to WVP so `onLine:true` and `hostAddress` = real LAN  
3. Prove `diagnose-startplay` → play ok → soft open **`wvp-zlm primary`**  
4. Fleet **5060** stays for daily ops (other cam / after lab)

Say **MOB-APPLY mob-wvp-stale-docker-host-clear-reregister-v1** when ready.  
No give-up menu. No restore lecture.

---

## One line

**Decoded: ZLM OK; startPlay = stream/SIP timeout; WVP device host is Docker 172.21.0.1. Next = clear stale + LAN re-register path.**
