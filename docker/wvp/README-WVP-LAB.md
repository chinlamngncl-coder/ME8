# WVP + ZLM lab — modern split

**MOB:** `mob-wvp-zlm-modern-split`  
**Track:** Tender / GB28181 scale (not the 8-BWC Fleet wall)

| Role | Image |
|------|--------|
| WVP 2.7.3 | `gemcjz/wvp-pro:latest` |
| ZLM (current) | `zlmediakit/zlmediakit:master` |
| Postgres / Redis | `postgres:15-alpine` / `redis:7-alpine` |

Fleet wall / PTT SIP **5060** are **not** changed. WVP SIP on host = **5061**.

Fossil all-in-one (2021 Hub `648540858/wvp_pro`) kept as `docker-compose.wvp-fossil.yml` for emergency rollback only.

---

## One-click start

1. Start **Docker Desktop** (wait until ready).  
2. Double-click **`START-WVP-LAB.bat`** in the ME8 folder.

---

## Proof

1. Open **http://192.168.1.38:18080** (or `http://127.0.0.1:18080`)  
2. Login **admin** / **admin** (try **admin123** if needed)  
3. Point GB28181 cameras at:

| Field | Value |
|--------|--------|
| SIP server IP | Dashboard LAN IP (e.g. `192.168.1.38`) |
| SIP port | **5061** |
| Domain | `4401020049` |
| Platform ID | `44010200492000000001` |
| Password | `admin123` |

4. Cams may need a short re-register after stack recreate.  
5. Play: dashboard **Lab · WVP two tiles**, or WVP UI.

---

## Ports (lab)

| Host | Use |
|------|-----|
| 18080 | WVP web UI |
| 5061 | GB28181 SIP (WVP) |
| 80 / 18088 | Modern ZLM HTTP-FLV (Track B play) |
| 8080 | Separate **me8-zlm** for BWC / Fleet lab |
| 5060 | Fleet PTT / BWC SIP — unchanged |

---

## Config files

| Host path | Role |
|-----------|------|
| `docker/wvp/zlm-modern/config.ini` | Modern ZLM (`mediaServerId=me8-zlm-modern`) |
| `docker/wvp/wvp-config/application-modern.yml` | WVP → mysql/redis/ZLM wiring |
| `docker/wvp/zlm-bundled/config.ini` | Fossil only (unused by modern compose) |

---

## Stop

`STOP-WVP-LAB.bat` — stops mysql + redis + me8-wvp-zlm + me8-wvp. Fleet `me8-zlm` left running.

---

## Note

Do **not** tune 2021 fossil knobs as the scale answer. Google / modern ZLM keys belong in `zlm-modern/config.ini` only.
