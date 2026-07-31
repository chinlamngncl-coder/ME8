# MOB DISC — CN partner deploy pack — architecture recon (audit only)

**Date:** 2026-07-31  
**Status:** DISC / RECON ONLY — **no packaging, no code APPLY in this disc**  
**Audience:** Lead architect (Chinese partner foolproof deployment) + Google  
**Operator request:** Scan entire Mobility Axiom repo; report 5 areas; do not build/pack yet  
**Product face:** Mobility Axiom (Ubitron). Internal: ME8 / C2.

**Past pack failure (locked context):** Prior customer zip disasters (wrong Node, missing deps, wrong root bats, lab IPs, secrets in zip) are documented in `ME8-INTERNAL/ship-desk/PRE-SHIP-GATE-CHECKLIST.md`. This recon feeds a **new** CN design — do not blindly re-run PH/KR oneshot without architect review.

---

## Pack gather / pre-ship (print when packing later — not execute now)

See `MOB-DISC-SHIP-PACK-GATHER-REMINDER-20260725.md` + PRE-SHIP GATE Section A.  
**This disc does not authorize `build:ship` / zip.**

---

## 0. Runtime topology (what actually runs)

| Layer | Runs where | Required for core Fleet? |
|-------|------------|---------------------------|
| Node Fleet (`server.js` / ship `run.js` / 1-pack `me8-server.exe`) | **Host** Windows | **Yes** |
| Bundled Node **22+** + `vendor/ffmpeg-lgpl/ffmpeg.exe` | Host | Yes (Fleet decode path) |
| Valkey + PostgreSQL | Docker `docker-compose.enterprise.yml` | Optional (enterprise catalog/state; lab can degrade) |
| WVP + ZLM (+ own Valkey/Postgres) | Docker `docker/wvp/docker-compose.wvp.yml` | **Yes for current video handoff** (`FM_WVP_VIDEO_HANDOFF=1`) |
| Standalone ZLM bench | `docker/zlm.compose.yml` | Lab only |
| LiveKit + egress + ingress | `docker/livekit.compose.yaml` | **Only Video Conference** |
| FR sidecars (Python) | Host `127.0.0.1:8765–8767` | If FR licensed |
| ANPR sidecar (Python) | Host `127.0.0.1:8768` | If ANPR licensed |
| `wvp-sip-lan-proxy` | Host script → Docker SIP | Lab/WVP GB register path |

**Primary customer paths already in repo (do not invent a third blindly):**

| Recipe | Script | Desktop folder | App folder |
|--------|--------|----------------|------------|
| PH/KR oneshot | `scripts/me8-ship/PACK-PH-KR-ME8-ONESHOT.ps1` | `Mobility Test 2` | `Ubitron-ME8` |
| CN trial | `scripts/PACK-SHIP-DELIVERY.ps1 -Variant Cn` / `PACK-CN-TRIAL.ps1` | `CN Trial Mobility` | `Mobility-Axiom` |
| Protected blob | `npm run build:ship` → `ship-build/protected/` | — | `node run.js` |
| 1-Pack exe | `npm run build:1pack` | — | `me8-server.exe` |

---

## 1. Docker & service architecture

### 1.1 Live compose / Dockerfile inventory (ignore `baseline/**`)

| File | Purpose |
|------|---------|
| `docker/Dockerfile` | App image: Node 22 + `ship-build/protected` → `node run.js`; EXPOSE 3888, 5060/udp, 29201/udp; VOLUME storage/keys |
| `docker/docker-compose.enterprise.yml` | **valkey** + **postgres** for Fleet (project `mobility-enterprise`) |
| `docker/wvp/docker-compose.wvp.yml` | **Modern split:** wvp-redis (Valkey), wvp-db (Postgres 15), wvp-zlm, wvp (gemcjz/wvp-pro) |
| `docker/wvp/docker-compose.wvp-fossil.yml` | Fossil all-in-one `648540858/wvp_pro` (lab legacy) |
| `docker/zlm.compose.yml` | Standalone `me8-zlm` (Fleet ZLM bench) |
| `docker/livekit.compose.yaml` | LiveKit server + Valkey + egress + ingress |
| `ship-build-test/customer-pack/docker/*` | Staged pack mirrors (not source of truth) |

**No Dockerfile** under `fr-sidecar*` / `anpr-sidecar` (host Python venvs).

### 1.2 Services defined (names)

**Enterprise (`mobility-enterprise`):**

| Service | Image | Host publish | Volume |
|---------|-------|--------------|--------|
| `valkey` → `mobility-valkey` | `valkey/valkey:8-alpine` | `127.0.0.1:6379` | named `mobility_valkey_data` |
| `postgres` → `mobility-postgres` | `postgres:16.10-alpine` | `127.0.0.1:5432` | named `mobility_postgres_data` |

**WVP modern (`docker/wvp/docker-compose.wvp.yml`):**

| Container | Role | Host ports (lab) |
|-----------|------|------------------|
| `me8-wvp-redis` | Valkey (DNS name kept for WVP) | internal |
| `me8-wvp-db` | Postgres `wvp2` | internal; init SQL bind-mount |
| `me8-wvp-zlm` | ZLMediaKit | **80**, **18088**, 19355, 10000, **30000–30100** udp/tcp |
| `me8-wvp` | WVP-Pro GB28181 | **18080**, **5061**→5060 |

**LiveKit:** `redis` (Valkey), `livekit` (7880/7881, UDP 51000–51100), `egress`, `ingress` (1935).  
**Volume hazard:** `../storage/conference-recordings:/recordings` (relative to `docker/`).

**Legal pin (locked):** Never swap Valkey → floating `redis:*` (SSPL risk). Verify: `scripts/verify-enterprise-redis-image-legal-pin.js`.

### 1.3 Hardcoded mounts / bridges that break on a new machine

| Hazard | Where | Architect action |
|--------|-------|------------------|
| Fallback LAN **`192.168.1.38`** | WVP compose `WVP_HOST_IP`, `lib/wvpLabClient.js`, `wvpVideoHandoff.js`, START-WVP-LAB, many docs | Partner `.env` must set real Wi‑Fi/Ethernet IP — **never 172.17–172.31** |
| GB SIP IDs **`4401020049` / `44010200492000000001`** | `docker/wvp/docker-compose.wvp.yml`, `wvp-config/application-modern.yml` | **Guangdong-style lab IDs** — Jiangsu partner needs **their** GB28181 domain/platform IDs |
| Relative bind mounts `./zlm-modern/config.ini`, `./wvp-config/...`, `./mysql-init/...` | WVP compose | Must ship folder layout with compose; absolute paths break if cwd wrong |
| Enterprise ports bound **127.0.0.1 only** | enterprise compose | Fine for same-host Node; multi-host DB needs redesign |
| Host **:80** mapped to ZLM | WVP compose | Collides with IIS/other; CN servers often need 18088-only advertise |
| TZ `Asia/Singapore` | WVP containers | Confirm Jiangsu TZ (`Asia/Shanghai`) for partner |
| Lab default WVP/DB passwords `admin`/`root`/`root123` | compose env | Must change before partner expose |
| Hyper-V UDP 50000–50459 vs LiveKit **51000–51100** | livekit compose comment | Windows partner VC must keep offset |

**No custom Docker bridge name** beyond Compose defaults; container DNS (`me8-wvp-zlm`, `me8-wvp-redis`) is internal.

---

## 2. Core dependencies

### 2.1 Node backend (`package.json` — primary)

| Package | Role |
|---------|------|
| `express` | HTTP API / static |
| `socket.io` + `ws` | Dashboard sockets / video-audio / MSG |
| `sip` | GB28181 / Fleet SIP |
| `ftp-srv` | BWC evidence FTP |
| `ioredis` | Valkey |
| `pg` | Postgres catalog |
| `livekit-server-sdk` | VC |
| `onvif` | Fixed cams |
| `multer`, `nodemailer`, `qrcode`, `xml2js`, `dotenv` | Upload / mail / 2FA QR / XML / env |
| `tesseract.js` | Light OCR (not ANPR ship path) |
| `node-llama-cpp` | Centre LLM (optional GGUF) |

**Ship must include:** Node **22+** (`node:sqlite`), synced ship deps (multer historically missing = FAIL).

**Native/binary:** `vendor/ffmpeg-lgpl/ffmpeg.exe` (LGPL) via `lib/ffmpegRuntime.js` — required unless `FM_FFMPEG_ALLOW_SYSTEM=1`.

### 2.2 Python AI sidecars (heavy)

| Sidecar | `requirements.txt` | Heavy stack | Default port |
|---------|-------------------|-------------|--------------|
| `anpr-sidecar/` | FastAPI, OpenCV, Pillow, **PaddleOCR/PaddlePaddle**, **onnxruntime**, **fast-alpr[onnx]** | Plate det MIT ONNX 512 + OCR | **8768** |
| `fr-sidecar/` | FastAPI, OpenCV, **DeepFace**, **TensorFlow** | Face match lab | **8765** |
| `fr-sidecar-fast/` | FastAPI, OpenCV, **onnxruntime**, **insightface** | ONNX FR | **8766** |
| `fr-sidecar-seeta/` | FastAPI, OpenCV (+ Seeta natives) | Ship FR engine path | **8767** |
| `redaction-track/` | (separate) | Evidence redact | — |

No `pyproject.toml` in repo. Windows Paddle pins `protobuf<=3.20.2`.

### 2.3 Frontend heavy (bundled under `public/`)

Leaflet / MapLibre, mpegts.js (FLV), JSMpeg, Socket.IO client — not npm-shipped separately for static UI.

---

## 3. Maps & localization (zh-CN & Jiangsu)

### 3.1 Default GIS coordinates (Singapore lab today)

| Location | Default | File |
|----------|---------|------|
| Ops map boot | **lat 1.3521, lon 103.8198**, zoom 11 | `public/js/dashboard-boot.js`, `public/index.html` (map init), `public/js/tactical-shell.js` |
| Country presets | `sg` same; **`cn` = Beijing 39.9042, 116.4074** | `public/js/mobility-map-gis.js` → `COUNTRY_PRESETS` |
| MapLibre fallback center | `[103.8198, 1.3521]` | `public/js/maplibre-primary.js` |
| Lang→country default | `zh` → `cn` | `LANG_DEFAULT` in `mobility-map-gis.js` |

**Jiangsu partner target (architect):** Lat **32.0617**, Lon **118.7630** (Nanjing area).

**Change surfaces for a future APPLY (not this disc):**

1. `COUNTRY_PRESETS.cn` (or new `js` Jiangsu preset) in `mobility-map-gis.js`
2. Boot fallbacks in `dashboard-boot.js` / `index.html` / `tactical-shell.js` if pack forces zh-CN first open
3. Pack meta: `fm-map-countries=cn` (already used by CN trial pack)
4. Offline tiles extent must cover Jiangsu (see `scripts/BUILD-CHINA-OFFLINE-TILES.ps1`)

### 3.2 UI localization

| Item | Fact |
|------|------|
| Loader | `public/js/i18n.js` → `GET /locales/<lang>.json` |
| Storage | `localStorage` key **`fm_ui_lang`** |
| Default language | **`en`** (no `FM_*_LANG` env) |
| zh file | `public/locales/zh.json` — **Simplified Chinese** (`zh-CN`); built via `scripts/build-zh-locale.js` |
| Completeness | en ~2990 keys; zh ~2101 keys — **~30% gap** (English fallback) |
| Default supported meta | Often `en,fil,id,th,ko` — **zh not in default list** unless pack injects `<meta name="fm-locales" content="en,zh">` |
| CN pack | `PACK-SHIP-DELIVERY.ps1` Variant `Cn` injects zh meta + offline map flags |
| PH/KR pack | **Strips** `zh.json` |

Hardcoded English remains in some UI strings; i18n is `data-i18n` driven where wired.

### 3.3 Map tiles in China (critical)

| Mode | Behavior |
|------|----------|
| Online default | OSM `tile.openstreetmap.org` — **often blocked in CN** |
| CN offline | `fm-map-offline-only=1` + `data/gis/offline/tiles/` via `lib/gisOffline.js` / `map-offline-tiles.js` |
| OpenFreeMap | `maplibre-primary.js` bright style URL — also external |

**Foolproof CN pack must ship offline tiles** (existing CN trial path). Do not rely on OSM.

---

## 4. BWC ingestion & telemetry

### 4.1 Video — dual path (do not confuse)

```
BWC ──SIP :5060──► wvp-sip-lan-proxy ──► Docker WVP :5061 ──► ZLM FLV :18088/:80
         │
         └── optional Fleet SIP :5062 (YDT / MESSAGE GPS / DeviceControl)
Dashboard ── start-video ──► WVP startPlay (handoff ON) ──► Me8LivePlayerFactory.attachFlvPrimary
         └── (handoff OFF) Fleet INVITE + ffmpeg + JSMpeg on FM_VIDEO_WS_PORT
```

| Mode | Env | Protocol | Key files |
|------|-----|----------|-----------|
| **Current lab/product video** | `FM_WVP_VIDEO_HANDOFF=1` | GB28181 register to WVP; HTTP-FLV from ZLM | `lib/wvpVideoHandoff.js`, `lib/wvpLabClient.js`, `public/js/live-player-factory.js`, `public/js/video-wall.js` |
| Classic Fleet | handoff off | SIP INVITE Play → RTP → ffmpeg → JSMpeg WS | `lib/liveStreamPool.js`, `server.js` SIP |

**Do not** recommend turning handoff off to “simplify” pack (locked WVP finish rule).

### 4.2 Ports table (defaults)

| Service | Env / note | Default |
|---------|------------|---------|
| HTTP dashboard | `FM_HTTP_PORT` | **3888** code/example; lab often **3988** |
| HTTPS | `FM_HTTPS_PORT` | **4438** |
| Setup UI | `SETUP_PORT` @ 127.0.0.1 | **13988** |
| Video WS | `FM_VIDEO_WS_PORT` | HTTP+1 |
| Audio WS | `FM_AUDIO_WS_PORT` | HTTP+2 |
| MSG WS | `FM_MSG_WS_PORT` | **6000** |
| PTT TCP | `FM_PTT_PORT` | **29201** |
| Fleet SIP | `FM_GB28181_SIP_PORT` | code default **5062** (`.env.example` often 5060 — conflict risk) |
| WVP GB SIP (host) | proxy listen | **5060** → Docker **5061** |
| WVP API | — | **18080** |
| ZLM FLV | `FM_WVP_ZLM_HTTP_PORT` | **18088** (+ host 80 lab) |
| FTP evidence | `FM_FTP_PORT` | **21** + PASV 20000–20100 |
| FR / ANPR | — | **8765–8768** @ 127.0.0.1 |
| LiveKit | — | **7880/7881**, UDP **51000–51100**, RTMP **1935** |

### 4.3 GPS / telemetry

| Mechanism | Detail |
|-----------|--------|
| Protocol | SIP **MESSAGE** MANSCDP XML: `MobilePosition`, `LocationInfo`, DeviceStatus |
| Query | `sendMobilePositionQuery` in `server.js` |
| Cache | `storage/last-gps.json`; API `GET /api/last-gps` |
| Tracks | `lib/gpsTrack.js`, `lib/smartGpsTrack.js` |
| Patrol poll | `FM_GPS_POLL_MS` default **120000** |
| High-res interval | `FM_GPS_HIGH_RES_INTERVAL_SEC` default **15** |

### 4.4 Stress / mock generators

| Path | Purpose |
|------|---------|
| `scripts/scale-load-msg-ws.js` | MSG WS load (not full BWC SIP) |
| `scripts/anpr-smoke-harden.py` | Synthetic ANPR OCR |
| `scripts/fr-bench/*` + `bench/fr/` | Offline FR engine bench |
| `scripts/verify-sos-group-sip-call.js` | Mock UDP SIP unit |
| `scripts/me8-ship/SMOKE-COMPOSE.ps1` | Compose smoke |
| **Missing** | No in-repo mock-BWC device, no fake-GPS injector, no SIPp scenarios (comment only) |

---

## 5. Licensing & external keys

### 5.1 Air-gap `license.lic` (Ed25519) — modern ship

| Piece | Path / env |
|-------|------------|
| Verify | `lib/licenseManager.js`, `lib/licenseGatekeeper.js` |
| Embedded pubkey | `lib/licenseVerifyKey.js` |
| File search | `storage/license.lic`, root `license.lic` |
| Pubkey resolve | `FM_LICENSE_PUBLIC_KEY` → `keys/license-public.pem` → embedded |
| Require | `FM_AIRGAP_LICENSE_REQUIRED=1` (also forced by `FM_LICENSE_REQUIRED` / `FM_RENTAL_MODE` in air-gap helper) |
| Signer (vendor only) | `tools/generate-license.js` — **`--print-hwid` on customer server** |
| Private key | `keys/license-private.pem` — **NEVER ship**; gitignored |
| Setup upload | `POST /api/setup/license` in `lib/setupOnlyServer.js` → writes `storage/license.lic` |
| Payload fields | customerName, hardwareId, expiryDate, maxFixedCameras, maxBwcDevices, features{}, optional orgId, tacticalPinLiveCap |

### 5.2 Legacy / dual `platform-license.json`

| Piece | Path |
|-------|------|
| Runtime | `lib/platformLicense.js` |
| File | `storage/platform-license.json` |
| Issuer | Sibling `MobilityC2-VENDOR-IMPORTANT/LicenseIssuer/` (not in ME8 customer zip) |
| When | `FM_RENTAL_MODE=1` or `FM_LICENSE_REQUIRED=1` |

**Architect note:** PH/KR oneshot historically shipped **platform-license.json**; protected/1-pack story uses **license.lic**. CN partner design must pick **one primary story** (or document both gates explicitly) to avoid “zero trust” pack confusion.

### 5.3 Other secrets (never in customer zip)

- Root `.env` lab passwords, `FM_LIVEKIT_API_SECRET`, WVP DB passwords  
- `license-private.pem`  
- Vendor LicenseIssuer tree  
- Customer-specific signed `.lic` should be issued **for partner HWID**, not baked into a public template zip unless trial HWID is intentional  

---

## 6. Extra intel (architect asked or not — give it)

1. **GB28181 domain IDs are lab Guangdong-shaped (`440102…`)** — Jiangsu partner cameras will not register until IDs match their platform plan.  
2. **Two SIP listeners in lab** (5060 WVP vs 5062 Fleet) — docs that say “SIP is 5060” alone are incomplete.  
3. **3888 vs 3988** — code default 3888; lab packs often 3988; Setup 13988 must not collide.  
4. **Offline map + zh meta** already exist in CN trial packer — prefer evolve that over copying PH/KR (which strips zh).  
5. **Docker Desktop** required for LiveKit VC; core Fleet + WVP stack also Docker-heavy today — air-gap CN site needs Docker install story or a Windows MediaServer.exe alternate (PH/KR optional ZLM vendor path).  
6. **FFmpeg LGPL binary** must be in pack or Fleet decode fails.  
7. **ANPR/FR Python venvs** are large; decide ship-with-venv vs install scripts (`anpr-sidecar/INSTALL.ps1`, FR START bats).  
8. **Legal AI:** FastALPR/open-image-models MIT path for plates; do not pull AGPL Ultralytics into CN pack. Valkey not Redis.  
9. **Brand:** customer face stays **Mobility Axiom**; do not rename to C2 in UI.  
10. **Never advertise WSL `172.17–172.31`** as server IP.  
11. Past disaster checklist lives in PRE-SHIP GATE — Node 22, multer, zip **root** Install/Start bats, smoke on clean port, no private key, TOTP not suspended for real ship.

---

## 7. Recommended next step (single path — no pick-A/B)

**Do not zip yet.** Architect designs CN pack from:

1. Base = **CN trial** recipe (`PACK-SHIP-DELIVERY -Variant Cn`) + **protected `build:ship`** + air-gap **`license.lic`** for partner HWID  
2. Mandatory deltas: Jiangsu map center **32.0617 / 118.7630**, `fm-locales=en,zh`, offline tiles Jiangsu extent, WVP **GB IDs + HOST IP + Asia/Shanghai**, strip lab `192.168.1.38`  
3. Pre-ship gate + pack gather before any zip leaves Ubitron  

**Next APPLY (when ordered):** named MOB e.g. `CN-PARTNER-PACK-DESIGN-V1` (design/spec only) or `CN-JIANGSU-MAP-LOCALE-DEFAULTS-V1` (code) — **not authorized by this disc**.

---

## Lock

**RECON ONLY. No packaging scripts generated. No product code changed for Jiangsu/zh in this MOB.**  
Paper for Google / lead architect. Operator PASS on recon accuracy before any pack APPLY.
