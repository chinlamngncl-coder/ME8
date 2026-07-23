# MOB APPLIED — mob-wvp-sip-lan-source-ip-v1

**Date:** 2026-07-17 ~01:14  
**Trigger:** Operator APPLY after “use wall as-is / stop” was wrong  
**5060:** Fleet SIP untouched · no BWC port homework

---

## What we built (work continues — not parked)

| Piece | Role |
|-------|------|
| Host **SIP LAN proxy** `scripts/wvp-sip-lan-proxy.js` | Listens **:5061** UDP+TCP — sees real BWC `192.168.x` peer |
| Docker WVP SIP map | **15061→5060** only (no Docker publish of 5061 → no SNAT `172.21.0.1`) |
| `lib/wvpSipLanMap.js` | deviceId → LAN from proxy peer/Contact + Fleet `storage/last-sip-contact.json` |
| `wvpLabClient.syncLanSourceIps` | PATCH WVP `/api/device/query/device/update` when host is Docker `172.x` |
| `startPlay` | Sync LAN before INVITE |
| `clearStale…` | Prefer patch; DELETE only if no LAN known |
| `START-WVP-LAB.ps1` | Recreate WVP ports + start proxy + sync |
| Lab API | `POST /api/lab/wvp/sync-lan-hosts` |

---

## Proof now (agent)

| Check | Result |
|-------|--------|
| `docker port me8-wvp` SIP | **15061→5060** (not 5061) |
| Proxy listen | **TCP+UDP 0.0.0.0:5061** (node) |
| Fleet contact → map | `3402…0008→192.168.1.128`, `…0009→192.168.1.78` |
| WVP device list | Still **empty** (no REGISTER hit WVP yet after clear) |
| `wvp-zlm primary` | **Not yet** — needs online WVP device with LAN host |

So: **SNAT path fixed.** Device rows still need a REGISTER into WVP (next work if Soft Open still shows empty WVP).

---

## You (one step — not “stop”)

1. Soft Open All (desk as usual).  
2. Optional once: `RESTART-FLEET.bat` so running Fleet picks up sync-before-startPlay (proxy already patches without it).  
3. Pass/fail from picture + whether fleet.log shows `wvp-zlm primary` or still `zlm-relay`.

**Do not** change BWC to 5061. **Do not** wait for God.

---

## If Soft Open still not Plan A

Agent next (say APPLY): **`mob-wvp-fleet-register-mirror-v1`**  
Fleet already has real Contact LAN on **5060** — mirror/register path into WVP **without** rewriting cams off 5060.

---

## Files

- `docker/wvp/docker-compose.wvp.yml`
- `scripts/wvp-sip-lan-proxy.js` (new)
- `scripts/START-WVP-LAB.ps1`
- `lib/wvpSipLanMap.js` (new)
- `lib/wvpLabClient.js`
- `server.js` (lab sync API only)

---

## One line

**Host :5061 proxy + WVP :15061 + Fleet-contact LAN patch APPLIED. Not stopped. Soft Open; if still no WVP row → APPLY register-mirror next.**
