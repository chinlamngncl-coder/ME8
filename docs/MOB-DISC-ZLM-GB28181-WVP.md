# MOB-DISC — ZLM + WVP-Pro (GB28181 scale)

**Status:** `mob-wvp-zlm-lab-bringup` **APPLIED** 2026-07-14 — container **UP** (Docker Hub `648540858/wvp_pro`)  
**Search:** `WVP`, `WVP-Pro`, `GB28181`, `wvp-zlm`, `tender scale`

## Plain English

| Name | Role |
|------|------|
| **WVP-Pro** | GB28181 front desk — cameras register; manages many streams |
| **ZLM** | Media engine — this lab image bundles WVP+ZLM together |

## Bringup result (this PC)

| Check | Result |
|-------|--------|
| Image | `648540858/wvp_pro:latest` (Aliyun image dead) |
| Container `me8-wvp` | Running |
| UI | `http://192.168.1.38:18080` / `http://127.0.0.1:18080` |
| GB SIP host port | **5061** (Fleet **5060** untouched) |
| Bundled ZLM HTTP | host **18088** |
| BWC `me8-zlm` | Still on **8080** (separate) |

## Operator proof

1. Open UI → login **admin** / **admin** (try admin123 if needed)  
2. Register one GB camera → SIP IP = LAN, port **5061**  
3. See device in WVP; play there (not Fleet wall)  

**2026-07-14:** device + channel + **Play PASS** (top speed). Lab play URL port: `mob-wvp-play-host-port-80`.  
**Speed vs our wall:** `docs/MOB-DISC-WVP-TOP-SPEED-VS-WALL.md` (DISC only).

## Scripts

- `START-WVP-LAB.bat` / `STOP-WVP-LAB.bat`  
- `docker/wvp/README-WVP-LAB.md`

## Not this MOB

Fleet wall ↔ WVP URL join · slim WVP→me8-zlm only · customer pack without Docker
