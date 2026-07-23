# MOB APPLIED — mob-wvp-fleet-register-mirror-v1

**Date:** 2026-07-17 ~01:32  
**5060:** Fleet SIP untouched · **no BWC port change**  
**Depends on:** `mob-wvp-sip-lan-source-ip-v1` (host :5061 proxy)

---

## What it does

Cams stay on **Fleet 5060**. Agent mirrors GB REGISTER into WVP:

1. UDP REGISTER → host **:5061** proxy → WVP (digest auth)  
2. **Contact** = real BWC LAN from Fleet `last-sip-contact.json`  
3. SQL harden: `host_address` = LAN (kill Docker `172.x` peer stamp) + default channel row  
4. Redis device keys cleared so list matches DB  
5. Refresh REGISTER ~every 120s  

Also: Fleet REGISTER hook + `POST /api/lab/wvp/mirror-register` + START-WVP bootstrap.

---

## Proof (agent, live)

| Check | Result |
|-------|--------|
| Mirror `…0008` / `…0009` | **200 OK** |
| `hostAddress` | **`192.168.1.128:41240`** / **`192.168.1.78:46299`** (not 172.x) |
| `dockerHostSuspect` | **false** |
| `channelCount` | **1** each |
| `diagnoseStartPlay` | Past “通道不存在” → **`receive_stream_timeout`** (INVITE/RTP still open) |

So: **WVP rows + LAN + channel = PASS.** Stream pull still FAIL (cam may ignore WVP-sourced INVITE / RTP). Not parked — next dig is stream/INVITE answer.

---

## Files

- `lib/wvpRegisterMirror.js` (new)  
- `lib/wvpDbLanPatch.js` (new)  
- `lib/wvpLabClient.js` — sync uses SQL patch; `syncDeviceCatalog`; msgKey `channel_not_found`  
- `server.js` — REGISTER schedule + lab mirror API  
- `scripts/START-WVP-LAB.ps1` — bootstrap mirror  

---

## You (one step)

1. **`RESTART-FLEET.bat` once** — loads REGISTER→mirror hook.  
2. Soft Open All.  
3. Pass = `live broker wvp-zlm primary`.  
4. Fail = still `zlm-relay` / timeout — tell agent (next: INVITE/RTP answer MOB, not BWC port change).

---

## One line

**Fleet mirrors REGISTER into WVP with LAN Contact + channel. Devices online on LAN. Soft Open after Fleet restart; stream timeout = next dig.**
