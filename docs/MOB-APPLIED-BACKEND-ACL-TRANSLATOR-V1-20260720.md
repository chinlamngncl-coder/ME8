# MOB-APPLIED — Backend ACL translator V1 (Step 1)

**APPLY:** `MOB-APPLY-BACKEND-ACL-TRANSLATOR-V1`  
**Date:** 2026-07-20  
**DISC:** `docs/MOB-DISC-BACKEND-ACL-AND-MEDIA-SPLIT-20260720.md`  
**Frontend:** **frozen** — no `public/**` edits

---

## What landed (backend only)

| File | Role |
|------|------|
| `lib/wvpFleetAclTranslator.js` | WVP/GB → classic field shapes |
| `lib/wvpEventBus.js` | Ingest Alarm / DevStatus / register → `sos-alarm` / `device-status` / `heartbeat` |
| `server.js` | Mount `/api/lab/wvp/*` **before** JWT |
| `scripts/wvp-sip-lan-proxy.js` | Publish MESSAGE Alarm/DevStatus + REGISTER to event bus |

**Not in this APPLY:** video handoff (Step 3), PTT changes (Step 2 already classic).  
**5060:** **unchanged** — still host proxy listen → WVP `:15061`.

---

## Lab ports / platform (testing)

### Unchanged SIP video door
| Item | Value |
|------|--------|
| **Host GB SIP (cams → WVP)** | **`192.168.1.38:5060`** — **no change** |
| Proxy target | `127.0.0.1:15061` (Docker WVP) |

### Classic Fleet (dashboard / PTT)
| Item | Value |
|------|--------|
| Dashboard | `http://192.168.1.38:3988` (or localhost) |
| Fleet SIP (classic cam home) | **`:5062`** · platform `34020000002000000001` · realm `3402000000` · pwd `12345678` |
| PTT TCP | **`:29201`** · gtid **49** |

### WVP platform (if cam is on WVP for ACL smoke)
| Item | Value |
|------|--------|
| Domain | `4401020049` |
| Platform ID | `44010200492000000001` |
| Password | `admin123` |
| SIP port on BWC | **5060** (same host port — unchanged) |
| WVP UI | `http://192.168.1.38:18080` · admin/admin |

### ACL bus (curl smoke — no UI change)
```text
POST http://127.0.0.1:3988/api/lab/wvp/events
Content-Type: application/json

{ "type": "device-status", "cameraId": "34020000001329000008", "battery": "33" }
```
Expect Fleet log: `wvp acl device-status → fleet` and classic socket `device-status`.

Alarm:
```text
{ "type": "alarm", "cameraId": "34020000001329000008", "source": "wvp_acl_test" }
```
Expect `sos-alarm` on classic UI.

`FM_LAB_WVP` can stay **0** for classic video; ACL bus is mounted anyway.
