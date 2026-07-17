# MOB-APPLIED: mob-fleet-sip-port-5062-v1

**Date:** 2026-07-17  
**Status:** APPLIED (code/env) · **needs your restart + BWC UI**  
**Genre:** Dual-protocol GB28181 + YDT (`MOB-DISC-GOOGLE-DUAL-PROTOCOL-GB-YDT-WAKEUP.md`)  
**Supersedes for this genre:** `MOB-DISC-NO-DICTATE-CHANGE-5060.md` (you ordered the split)

---

## Port map (locked)

| Role | Port | Who |
|------|------|-----|
| **GB28181 video** | **5060** | WVP via host SIP LAN proxy → container `:15061` |
| **Fleet YDT / telemetry SIP** | **5062** | Node `server.js` |
| Msg WS | 6000 | unchanged |

Mirror REGISTER into WVP = **OFF** (`FM_WVP_MIRROR_REGISTER=0`). Real cams must GB-register to WVP.

---

## What changed

| File | Change |
|------|--------|
| `.env` | `FM_GB28181_SIP_PORT=5062` · `WVP_SIP_PROXY_LISTEN=5060` · `FM_WVP_SIP_PORT=5060` · `FM_WVP_MIRROR_REGISTER=0` |
| `storage/server-settings.json` | `sip.sipPort` → **5062** |
| `lib/serverSettings.js` | Default 5062; **env wins** over stale JSON |
| `scripts/wvp-sip-lan-proxy.js` | Default listen **5060** |
| `scripts/START-WVP-LAB.ps1` | Proxy **5060**; mirror skipped unless flag=1 |
| `lib/wvpSipLanMap.js` / `wvpRegisterMirror.js` | Signal port 5060; mirror parked |
| `docker/wvp/docker-compose.wvp.yml` | Comments |
| `.env.me8.example` | Documents dual-protocol ports |

---

## You do now (order matters)

1. **Stop Fleet** (frees host **5060**).  
2. **Restart WVP lab** — double-click / run `START-WVP-LAB` (or restart proxy so it binds **:5060**).  
3. **Start Fleet** — log must show: `sip listening` · **`port":5062`**.  
4. On **each BWC** web UI:  
   - **GB28181** → PC IP (e.g. `192.168.1.38`), port **5060**, WVP platform: domain `4401020049` / id `44010200492000000001` / pwd `admin123`  
   - **YDT** → same IP, port **5062**  
5. Confirm WVP device list: cams **online**, host not `172.x`.  
6. Tell agent pass/fail — then next APPLY: **`mob-wall-play-wvp-flv-only-v1`**

---

## Prove

| Check | Expect |
|-------|--------|
| Fleet log | `sip listening` … `5062` |
| Proxy log | `UDP listen 5060` |
| WVP devices | Chin/kk online after GB point to 5060 |
| Soft Open picture | Not claimed in this MOB — that is M2 |

---

## Revert

- Fleet back to 5060: set `FM_GB28181_SIP_PORT=5060` + settings, restart; move proxy listen back to 5061 if needed  
- Or full: `RUN RESTORE-ME8-PRE-GATE-C`

---

## One line

**Fleet SIP is 5062; WVP GB video owns 5060. Restart Fleet→WVP proxy→Fleet, then point BWC GB=5060 / YDT=5062.**
