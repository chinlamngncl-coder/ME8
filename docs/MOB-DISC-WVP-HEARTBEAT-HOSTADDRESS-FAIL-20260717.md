# MOB DISC — Why “15s online” failed (check 2026-07-17 ~15:16)

**Status:** APPLIED — `mob-wvp-hostaddress-real-lan-v1` → `MOB-APPLIED-WVP-HOSTADDRESS-REAL-LAN-V1.md`  
**Related:** `mob-fleet-presence-from-wvp-v1` (presence poll works only when WVP stays online)

---

## Honest correction

“Refresh and wait ~15s” assumed **WVP already stable online**. That was overstated. Presence cannot invent online if WVP flaps to OFF.

---

## What the logs show

| Time | Fact |
|------|------|
| 15:13:11 | Fleet started presence poll (`wvp fleet presence started`) |
| 15:03–15:08 | Chin REGISTER to WVP via **`172.21.0.1`** (Docker gateway), renewals OK |
| 15:06 / 15:12 | **Heartbeat timeout** → WVP marks Chin/kk **OFF** |
| 15:15:31 | Chin REGISTER success again (`172.21.0.1:51446`) |
| 15:15:33 | Proxy/sync patches host to **`192.168.1.38:5060`** (PC), while real LAN remembered as **`192.168.1.131:46133`** |
| 15:15:35 | Presence MOB marks Axiom online for Chin (**did run once**) |
| Now (~15:16) | WVP **1/2** online (Chin yes, kk no) · host still PC IP not cam IP |

---

## Root cause (not ports)

1. Cam → proxy :5060 → WVP sees source **172.21.0.1**, not cam Wi‑Fi.  
2. Sync then sets WVP `hostAddress` to **PC :5060**, not **192.168.1.131**.  
3. WVP keepalive cannot reach the real BWC → **三次心跳超时** → offline.  
4. Presence correctly follows that OFF → Axiom goes dark again.

Ports 5060/5062 are listening. Platform password is not the current failure.

---

## Suggest (paper — need MOB-APPLY to code)

**`mob-wvp-hostaddress-real-lan-v1`**  
When patching WVP device after REGISTER: set `ip` / `hostAddress` to **remembered real LAN** (`192.168.1.131:…`), not `192.168.1.38:5060`. Keep INVITE relay via proxy as today.

Optional later: stop Fleet DeviceStatus SIP queries for WVP-only cams (they hit :5062 and get silence — noise only).

---

## Operator check (no code)

On BWC UI: still connected?  
WVP web device list: Chin green / kk red matches logs.  
Do **not** change ports again for this.

---

## One line

**Presence fired; WVP keepalive dies because hostAddress is PC/Docker not cam LAN — that is the real bug.**
