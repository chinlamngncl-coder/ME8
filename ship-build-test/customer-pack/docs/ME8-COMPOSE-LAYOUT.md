# ME8 compose layout — host Fleet + Docker sidecars

**Tree:** `C:\Users\user\Desktop\Enterprise Mobility\ME8`  
**MOB:** `mob-me8-compose-layout`  
**Phase:** A (documentation + Docker smoke). **Fleet is not wired to Valkey/Postgres yet** — that is Wave 0–3 in Phase B.

Mobility **core** (`server.js`) runs on the **Windows host** via `RESTART-FLEET.bat`. Optional **Docker Compose** stacks run beside it.

---

## 1. Architecture (ME8 bench)

```mermaid
flowchart TB
  subgraph host["Windows host"]
    Fleet["Mobility Fleet\nserver.js :3988"]
    BWC["BWCs / browsers\nLAN"]
  end
  subgraph ent["docker-compose.enterprise.yml"]
    VK["Valkey :6379"]
    PG["Postgres :5432"]
  end
  subgraph lk["livekit.compose.yaml"]
    LKR["LiveKit redis\ninternal only"]
    LK["livekit-server :7880/:7881"]
    EG["egress"]
    IN["ingress RTMP :1935"]
  end
  BWC --> Fleet
  Fleet -.->|"Phase B MOBs"| VK
  Fleet -.->|"Phase B MOBs"| PG
  Fleet -->|"FM_LIVEKIT_URL"| LK
  LK --> LKR
  EG --> LK
  IN --> LK
  BWC -->|"VC WebSocket"| LK
```

| Layer | Runs where | Compose file |
|-------|------------|--------------|
| Dashboard, SIP, PTT, SOS, live wall, evidence | **Host** (`node server.js`) | — |
| Valkey + Postgres (enterprise cache/catalog) | **Docker** | `docker/docker-compose.enterprise.yml` |
| Video conference MCU (LiveKit + egress + ingress) | **Docker** | `docker/livekit.compose.yaml` |

**Important:** LiveKit ships its **own** Redis container (internal to the LiveKit stack). Enterprise **Valkey** is a separate service for future Fleet wiring — do not assume they are shared today.

---

## 2. Port matrix (ME8 defaults)

### Host — Mobility Fleet

| Port | Protocol | Service | Env / notes |
|------|----------|---------|-------------|
| **3988** | TCP | Dashboard HTTP | `PORT` / `FM_HTTP_PORT` — **ME8** (trial uses **3888**) |
| **3989** | TCP | Live video WebSocket | `FM_VIDEO_WS_PORT` |
| **5060** | UDP/TCP | GB28181 SIP | `FM_GB28181_SIP_PORT` |
| **50050+** | UDP | SIP RTP (configurable) | `FM_GB28181_RTP_PORT` |
| **21** | TCP | FTP ingest | `FM_FTP_PORT` |
| **20000–20100** | TCP | FTP passive range | `FM_FTP_PASV_MIN/MAX` |
| **29201** | UDP | PTT | `FM_PTT_PORT` |
| **6000** | TCP | BWC message WebSocket | `FM_MSG_WS_PORT` — use **6100** only if trial Fleet runs on same PC |

### Docker — enterprise stack

| Port | Service | Container |
|------|---------|-----------|
| **6379** | Valkey | `mobility-valkey` |
| **5432** | PostgreSQL 16 | `mobility-postgres` |

### Docker — LiveKit stack

| Port | Protocol | Service |
|------|----------|---------|
| **7880** | TCP | LiveKit HTTP / signaling |
| **7881** | TCP | LiveKit RTC TCP |
| **50000–50100** | UDP | WebRTC media (published range) |
| **1935** | TCP | RTMP ingress (BWC share path) |

LiveKit **redis** has **no host port** — only `redis:6379` inside the compose network.

---

## 3. Compose files

### 3a Enterprise — `docker/docker-compose.enterprise.yml`

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
docker compose -f docker/docker-compose.enterprise.yml up -d
docker compose -f docker/docker-compose.enterprise.yml ps
```

| Service | Image | Volume |
|---------|-------|--------|
| `valkey` | `valkey/valkey:8-alpine` | `mobility_valkey_data` |
| `postgres` | `postgres:16-alpine` | `mobility_postgres_data` |

Default credentials (change before production — `mob-env-enterprise` MOB):

- Postgres: `mobility` / `mobility_dev_change_me` / DB `mobility`
- Future Fleet env (not active until Phase B):

```env
FM_REDIS_URL=redis://127.0.0.1:6379
FM_CATALOG_DB_URL=postgresql://mobility:mobility_dev_change_me@127.0.0.1:5432/mobility
```

Stop for degrade tests: `docker stop mobility-valkey` or `mobility-postgres` — see [07-DEGRADE-TESTS-AND-PG-RESYNC.md](./google-feedback-discussion/07-DEGRADE-TESTS-AND-PG-RESYNC.md).

### 3b Video conference — `docker/livekit.compose.yaml`

Config: `docker/livekit.yaml` (`node_ip` and `rtmp_base_url` patched from `.env` `HOST` by `scripts/START-LIVEKIT.ps1`).

```powershell
.\scripts\START-LIVEKIT.ps1
# or manually:
cd docker
docker compose -f livekit.compose.yaml up -d
```

Recordings: `storage/conference-recordings/` (mounted into egress).

**.env** (after LiveKit up — use your LAN IP, not localhost, for phones):

```env
FM_LIVEKIT_URL=http://127.0.0.1:7880
FM_LIVEKIT_PUBLIC_WS=ws://YOUR_LAN_IP:7880
FM_LIVEKIT_API_KEY=devkey
FM_LIVEKIT_API_SECRET=secret
```

Then `.\RESTART-FLEET.bat`. Dev keys `devkey`/`secret` match `docker/livekit.yaml` — **change for production VC**.

---

## 4. Recommended startup order

| # | Step |
|---|------|
| 1 | Stop trial Fleet if sharing SIP/FTP/ports (`SaaS Mobility` on `:3888`) |
| 2 | *(Optional)* `docker compose -f docker/docker-compose.enterprise.yml up -d` |
| 3 | *(Optional, if VC licensed)* `.\scripts\START-LIVEKIT.ps1` |
| 4 | `.\RESTART-FLEET.bat` — leave window open |
| 5 | Browser: `http://<HOST>:3988` |

---

## 5. Docker smoke (automated)

From ME8 root:

```powershell
.\SMOKE-COMPOSE.ps1
.\SMOKE-COMPOSE.ps1 -IncludeLiveKit
.\SMOKE-COMPOSE.ps1 -LeaveRunning
```

Checks:

- Docker CLI available
- Enterprise stack starts; Valkey `PING` + Postgres `pg_isready` healthy
- With `-IncludeLiveKit`: LiveKit compose up; HTTP probe on `:7880`

---

## 6. Firewall (customer site)

Open on the **dispatch server** (adjust if reverse proxy terminates HTTPS):

| Ports | For |
|-------|-----|
| 3988 TCP | Dashboard |
| 3989 TCP | Live wall WebSocket |
| 5060, RTP range | BWC SIP |
| 21 + passive FTP range | Evidence upload |
| 29201 UDP | PTT |
| 6000 TCP | BWC messaging |
| 7880, 7881 TCP + 50000–50100 UDP | Video conference (if used) |
| 1935 TCP | RTMP ingress (if BWC VC share used) |
| 6379, 5432 | Enterprise Docker **LAN only** — do not expose to WAN |

Full checklist also appears in **Settings → Server Config → firewall** rows.

---

## 7. Trial vs ME8 on one PC

| | Trial (`SaaS Mobility`) | ME8 |
|--|-------------------------|-----|
| HTTP | `:3888` | `:3988` |
| MSG WS | default `6000` | `6000` — set ME8 `FM_MSG_WS_PORT=6100` if both run |
| SIP / FTP | conflict if both started | stop one Fleet first |

Never copy trial `storage/` into ME8 — use `NEW-ME8-INSTALL.ps1`.

---

## 8. Phase B wiring (not done yet)

| MOB / wave | What |
|------------|------|
| `mob-env-enterprise` | Production `.env` for Valkey + Postgres URLs |
| Wave 2 | Valkey dual-write — SOS/live/PTT never blocked |
| Wave 3 | Postgres catalog + degrade paths |

Until those MOBs ship, enterprise compose is **infrastructure-only** — healthy containers prove the kit, Fleet still uses JSON/SQLite on disk.

---

## Sign-off (compose smoke)

| Check | Pass? |
|-------|-------|
| `SMOKE-COMPOSE.ps1` enterprise OK | ☐ |
| LiveKit smoke OK (if VC in scope) | ☐ |
| Fleet `:3988` up with compose running | ☐ |
| No port conflicts with trial | ☐ |
| **Tester / date:** | _______________ |

**Next MOB:** `mob-env-enterprise` or Phase A exit via [ME8-SMOKE-CHECKLIST.md](./ME8-SMOKE-CHECKLIST.md).
