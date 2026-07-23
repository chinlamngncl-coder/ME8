# MOB APPLIED — mob-wvp-stale-docker-host-clear-reregister-v1

**Date:** 2026-07-17 ~00:53  
**Files:** `lib/wvpLabClient.js` · `server.js` · `scripts/START-WVP-LAB.ps1`

---

## Done (live + code)

| Step | Result |
|------|--------|
| DELETE stale chin/kk (`172.21.0.1`) | **PASS** — WVP device list **empty** |
| `clearStaleDockerHostDevices()` | In client; runs on **START-WVP-LAB** |
| Lab API | `POST /api/lab/wvp/clear-stale-docker-hosts` |
| Wait helper | `GET /api/lab/wvp/wait-lan-register?deviceId=` (online + **not** Docker host) |
| Fleet SIP **5060** | Untouched |

**Proof:** after DELETE, 45s poll → still **0** devices (cams are only on Fleet; no auto WVP REGISTER).

---

## What this unblocked / what it did not

| Unblocked | Still blocked |
|-----------|----------------|
| Ghost rows that INVITE Docker gateway | **No LAN REGISTER yet** → still no `wvp-zlm primary` |
| Clean slate for a real register | Docker Desktop bridge will likely stamp **172.x again** on the next REGISTER unless SIP sees real LAN source |

Clear was required. Clear alone ≠ Plan A picture.

---

## Operator

1. **`RESTART-FLEET.bat`** (picks up new lab APIs / broker)  
2. Soft open as usual — expect fail-open Plan B until a **LAN** WVP register exists  
3. Do **not** change whole fleet off 5060  

---

## Concrete next (one)

**`mob-wvp-sip-lan-source-ip-v1`**

Fix WVP SIP so REGISTER/INVITE use **real BWC LAN IP**, not Docker `172.21.0.1` (Windows Docker Desktop NAT).  
Then one fresh register can pass `wait-lan-register` → diagnose startPlay → `wvp-zlm primary`.

Say **MOB-APPLY mob-wvp-sip-lan-source-ip-v1** when ready.

---

## Google paste (checks)

```
Cleared WVP devices with hostAddress 172.21.0.1 (Docker bridge). List empty.
Cams stay on Fleet SIP 5060 — no auto re-REGISTER to WVP :5061.
Ask: On Docker Desktop (Windows/WSL2), how should WVP SIP preserve real LAN source IP for GB REGISTER so hostAddress is 192.168.x not 172.21.0.1? Host-net in Desktop VM does not equal Windows LAN.
```

---

## One line

**Stale Docker-host devices cleared. Need SIP LAN source fix next — then register can stick.**
