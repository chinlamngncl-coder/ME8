# MOB DISC — WVP/ZLM infra up on classic floor · ports · what you do

**Date:** 2026-07-18  
**APPLY:** `MOB-APPLY mob-wvp-zlm-infra-up-classic-floor`  
**Status:** Operator map + infra bringup — **classic live flags stay OFF**  
**Search:** `infra up`, `18080`, `5060`, `15061`, `platform 440102`, `restart WVP?`

---

## Short answers

| Ask | Answer |
|-----|--------|
| Need to restart WVP if already running? | **No** — leave `me8-wvp` / `me8-wvp-zlm` up if UI `:18080` answers |
| Need to restart SIP proxy? | **Only if** host `:5060` is dead or not `wvp-sip-lan-proxy` — else leave it |
| Flip `FM_LAB_WVP=1` tonight? | **No** — not this MOB |
| Rekey Chin/kk to WVP now? | **No** — next thin APPLY. Classic Chin stays Fleet **:5062** |
| Where is the platform? | PC LAN **`192.168.1.38`** (your Wi‑Fi — never 172) |

---

## Ports & URLs (this lab PC)

| What | Where |
|------|--------|
| **Dashboard (Ops)** | `http://192.168.1.38:3988` |
| **WVP web UI** | `http://192.168.1.38:18080` or `http://127.0.0.1:18080` |
| WVP login | **admin** / **admin** |
| **WVP → ZLM HTTP-FLV** | `http://192.168.1.38:18088` |
| Cam **GB SIP → WVP** (when you later rekey) | IP **`192.168.1.38`** · port **`5060`** |
| Inside Docker (you do **not** type on BWC) | WVP SIP **`127.0.0.1:15061`** (proxy target) |
| **Fleet YDT / classic Chin SIP** | **`192.168.1.38:5062`** |
| PTT | **`29201`** |
| Gate-B / Fleet ZLM (separate) | host **`:8080`** (`me8-zlm`) — not WVP picture |

```text
Cam GB (later) ──► 192.168.1.38:5060 ──► wvp-sip-lan-proxy ──► 127.0.0.1:15061 (me8-wvp)
                                                                      │
                                                                      ▼
                                                              me8-wvp-zlm :18088 FLV

Chin classic now ──► 192.168.1.38:5062 ──► Fleet Node (FM_LAB_WVP=0)
You (browser)    ──► 192.168.1.38:3988 ──► Ops dashboard
```

---

## WVP platform IDs (BWC one-row — **later**, not this MOB)

When a future APPLY says rekey for WVP video:

| Field | Value |
|-------|--------|
| Server / IP | `192.168.1.38` |
| Port | `5060` |
| Domain / realm | `4401020049` |
| Platform / SIP server ID | `44010200492000000001` |
| Password | `admin123` |
| Device ID | **keep cam’s own** GB id |

**Not** Fleet platform `340200…` / pwd `12345678` for that WVP video row.

**Tonight classic:** leave Chin on Fleet **5062** + Fleet platform so Ops PASS stays.

---

## Do you need to restart WVP?

| Situation | Action |
|-----------|--------|
| Docker `me8-wvp` Up + `http://127.0.0.1:18080` returns OK | **Do nothing** — already good |
| Containers missing / UI dead | Double-click **`START-WVP-LAB.bat`** (starts Docker stack + ensures proxy) |
| Proxy dead but WVP UI OK | Run START again, or ask agent; script starts proxy if missing. Optional: `START-WVP-LAB.ps1 -RestartProxy` |
| After PC reboot | START-WVP-LAB once, then Fleet |

**Fleet restart does not require WVP restart.** They are separate.

---

## What to do after restarting Fleet

1. Wait until dashboard opens: `http://192.168.1.38:3988`  
2. **Classic smoke (must still PASS):** Chin live panel / pin, Stop, SOS, PTT, Call once if you use them.  
3. Optional: open WVP UI `http://192.168.1.38:18080` — login admin/admin — confirm page loads (devices may be empty/offline while cams stay on Fleet 5062 — **OK for this MOB**).  
4. Do **not** turn Soft Open / lab WVP live on.  
5. Do **not** rekey BWC to WVP until the next named APPLY.  
6. If classic feel dies → `RUN RESTORE-ME8-CLASSIC-PASS-20260718` (not Pre-Gate-C).

---

## Env lock (unchanged by this MOB)

`FM_LAB_WVP=0` · `FM_SOFTOPEN_WVP_ONLY=0` · `FM_WVP_FLEET_PRESENCE=0`

---

## Next (not this MOB)

Thin lab play / broker — e.g. `mob-wvp-zlm-lab-tile-or-broker-thin` — only when you APPLY.

**One line:** Infra = WVP+ZLM+proxy on LAN; you use dashboard `:3988` and optional WVP UI `:18080`; after Fleet restart only prove classic Ops — no WVP rekey / no flag flip tonight; restart WVP only if it is down.
