# wvp-GB28181-pro — Lab Setup

Handles GB28181 camera registration at scale. Feeds video into the existing ZLM container.  
This is the **tender track** stack — lab only until Gate C is approved.

---

## Before you start

ZLM must already be running:

```powershell
docker compose -p me8-zlm -f docker/zlm.compose.yml up -d
```

---

## Start wvp stack

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
docker compose -p me8-wvp -f docker/wvp/docker-compose.wvp.yml up -d
```

First start takes ~2 minutes — MySQL is initialising. Check with:

```powershell
docker compose -p me8-wvp -f docker/wvp/docker-compose.wvp.yml logs -f wvp
```

Look for: `Started WvpProApplication`

---

## wvp web UI

Open: `http://localhost:18080`  
Login: `admin` / `admin123`

---

## Point a BWC camera at wvp

On the camera, set the SIP server to:

| Field | Value |
|---|---|
| SIP Server IP | Your PC's LAN IP |
| SIP Port | `5061` |
| SIP Domain | `me8.local` (or whatever `WVP_SIP_DOMAIN` is set to) |
| SIP Password | `gb28181` (or `WVP_SIP_PASSWORD` value) |

The camera should appear in the wvp web UI under **Devices** within 30 seconds.

---

## Stop

```powershell
docker compose -p me8-wvp -f docker/wvp/docker-compose.wvp.yml down
```

Data is preserved in the `wvp-mysql-data` Docker volume.  
To wipe and start fresh: add `--volumes` to the down command.

---

## Environment overrides (optional, lab only)

Set these in your `.env` before starting:

| Variable | Default | What it does |
|---|---|---|
| `WVP_HOST_IP` | `127.0.0.1` | Your PC's LAN IP — cameras need this to register |
| `WVP_SIP_DOMAIN` | `me8.local` | SIP domain cameras register under |
| `WVP_SIP_PASSWORD` | `gb28181` | SIP password cameras use |
| `WVP_DB_PASSWORD` | `wvp_lab_pass` | MySQL user password (lab only) |
| `WVP_ZLM_SECRET` | ZLM default | Must match `secret=` in `docker/zlm-config/config.ini` |

---

## Notes

- SIP port is **5061** (not 5060) to avoid conflict with the existing PTT SIP stack.
- wvp and ZLM communicate over the `me8-zlm_default` Docker network — no extra firewall rules needed between them.
- `sipServer.js` and `pttServer.js` are not touched — PTT keeps working normally.
