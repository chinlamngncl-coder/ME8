# ME8 — ZLM sidecar setup (Ubitron internal)

**MOB:** `mob-me8-zlm-sidecar`  
**Audience:** Ubitron engineering / ship desk — not operators or partners

---

## What this MOB ships

| Item | Purpose |
|------|---------|
| `lib/zlmSidecar.js` | Health probe, config read, platform status |
| `scripts/me8-ship/Start-Me8ZlmSidecar.ps1` | Autostart before Fleet (when enabled) |
| `scripts/me8-ship/VERIFY-ZLM-SIDECAR.ps1` | Bench / ship desk PASS gate |
| `scripts/zlm/config.ini.example` | ZLM config template |
| `vendor/zlm/README.txt` | Where to place Windows binary |
| `docker/zlm.compose.yaml` | Lab Docker sidecar |

**Not in this MOB:** ingest bridge, failover, wall player — MOBs 4–6.

---

## Failover (mob-me8-zlm-failover)

When `FM_LIVE_ENGINE=zlm` and ZLM is sick, slow, or stalls:

- Fleet **keeps ffmpeg** for the wall (operator sees no engine switch).
- Logs: **`zlm failover`** with reason (`sidecar_unhealthy`, `readiness_timeout`, `stall`, `circuit_open`, `attach_failed`).
- Per-cam cooldown + site circuit breaker reduce ZLM flapping.
- Platform status: `zlm.ingest.failover` on `/api/platform/status` (internal).

| Key | Default |
|-----|---------|
| `FM_LIVE_ZLM_START_TIMEOUT_MS` | 8000 |
| `FM_LIVE_STALL_TIMEOUT_MS` | 5000 |
| `FM_LIVE_FAILOVER_COOLDOWN_MS` | 300000 (per cam) |
| `FM_LIVE_FAILOVER_WINDOW_MS` | 900000 |
| `FM_LIVE_CIRCUIT_COOLDOWN_MS` | 900000 |

---

## Ingest bridge (mob-me8-zlm-ingest-bridge)

When `FM_LIVE_ENGINE=zlm` or `FM_LIVE_ZLM_MIRROR=1` and ZLM health OK:

- Fleet keeps **one SIP INVITE** and RTP landing (unchanged).
- RTP packets **mirror** to ZLM `openRtpServer` port on localhost.
- **Wall still uses ffmpeg/JSMpeg** until `mob-me8-zlm-wall-mvp`.
- Logs: `zlm ingest attached`, `zlm ingest first rtp`, `zlm ingest detached`.
- Platform status: `GET /api/platform/status` → `zlm.ingest.active` / `zlm.ingest.streams`.

---

## Lab — Docker (fastest)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
docker compose -f docker/zlm.compose.yaml up -d
```

Add to bootstrap profile (internal):

```
FM_ZLM_ENABLED=1
FM_ZLM_HTTP_URL=http://127.0.0.1:8080
FM_ZLM_SECRET=me8-zlm-dev-secret-change-in-ship
FM_LIVE_ENGINE=zlm
FM_LIVE_FALLBACK_FFMPEG=1
```

Verify:

```powershell
.\VERIFY-ZLM-SIDECAR.ps1
.\RESTART-FLEET.bat
```

Platform status (super admin): `GET /api/platform/status` → `zlm.ok`

---

## Lab — Windows binary

1. Obtain ZLMediaKit **MediaServer** for Windows from upstream release.  
2. Copy to `vendor\zlm\MediaServer.exe`  
3. Copy `scripts\zlm\config.ini.example` → `vendor\zlm\config.ini`  
4. Match `[api] secret` with `FM_ZLM_SECRET` in bootstrap profile  
5. Set `FM_ZLM_BIN=vendor\zlm\MediaServer.exe`  
6. `.\RESTART-FLEET.bat` — autostarts ZLM before Node  

---

## Bootstrap keys (internal)

| Key | Example |
|-----|---------|
| `FM_ZLM_ENABLED` | `1` |
| `FM_ZLM_AUTOSTART` | `1` (default — set `0` to probe-only) |
| `FM_ZLM_HTTP_URL` | `http://127.0.0.1:8080` |
| `FM_ZLM_SECRET` | same as config `[api] secret` |
| `FM_ZLM_BIN` | `vendor\zlm\MediaServer.exe` |
| `FM_ZLM_CONFIG` | `vendor\zlm\config.ini` |
| `FM_ZLM_HEALTH_MS` | `15000` |
| `FM_LIVE_ENGINE` | `zlm` when testing primary path |
| `FM_LIVE_FALLBACK_FFMPEG` | `1` |

---

## PASS gate (MOB 3)

| # | Check |
|---|--------|
| S1 | `VERIFY-ZLM-SIDECAR.ps1` PASS |
| S2 | `/api/platform/status` shows `zlm.ok: true` |
| S3 | `RESTART-FLEET.bat` autostarts ZLM when binary or Docker up |
| S4 | Fleet starts even if ZLM down (fallback MOB uses ffmpeg) |

---

**Next MOB:** `mob-me8-zlm-ingest-bridge`  
**Backend validate (step 1):** [ME8-ZLM-BACKEND-VALIDATE.md](./ME8-ZLM-BACKEND-VALIDATE.md)  
**Plan:** [ME8-ZLM-LIVE-MVP.md](./ME8-ZLM-LIVE-MVP.md)
