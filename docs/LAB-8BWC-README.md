# Lane B — 8 BWC lab

**Path:** `C:\Users\user\Desktop\Enterprise Mobility\mobility-8bwc-lab`  
**Ship tree (do not edit):** `C:\Users\user\Desktop\Enterprise Mobility\SaaS Mobility` — trial-gold-1.10.1, 6 concurrent live  

This folder is a **copy of the ship tree** for Lane B work (8 BWC cap, offline maps, geofence enhancements). Changes here **do not** affect the shipped trial. Lives on **Desktop** next to the ship tree (moved from `C:\C2_Local\mobility-8bwc-lab` 2026-06-29).

---

## MOB applied here

| MOB ID | Date | Files | What |
|--------|------|-------|------|
| `mob-lab-offline-tiles-multi` | 2026-06-29 | `country-tile-bboxes.json`, `fetch-offline-tiles-bootstrap.js`, `BUILD-LAB-OFFLINE-MAPS.ps1` | Demo-2 bootstrap — **11 regions** (`--all-demo2`), no Malaysia |
| `mob-lab-offline-tiles-verify` | 2026-06-29 | `scripts/verify-offline-tiles.js`, `scripts/VERIFY-LAB-OFFLINE-TILES.ps1`, `BUILD-LAB-OFFLINE-MAPS.ps1` | Automated verify — 11 regions, OSM-block fingerprint, center sample; optional `--api` |
| `mob-maplibre-primary-lab` | 2026-06-29 | `public/js/maplibre-primary.js`, `public/index.html`, `lib/gisOffline.js`, `public/locales/en.json`, `mobility-map-gis.js` | MapLibre primary basemap (offline style or OpenFreeMap online); Leaflet overlay for pins; custom attribution strip (no MapLibre logo) |
| `mob-lab-country-ui-seven` | 2026-06-29 | `mobility-map-gis.js`, `index.html`, `public/locales/*.json` | Map region **7 countries** (no MY); labels via **i18n ops wording** (`map.country.*`) |
| `mob-lab-offline-layers-eight` | 2026-06-29 | `data/gis/offline/layers/*.geojson` (8 files) | Offline country boundary overlays for API presets |
| `mob-map-offline-only-lab` | 2026-06-29 | `public/index.html`, `public/js/map-offline-tiles.js`, `map-offline-pmtiles.js`, `public/locales/en.json` | Lab map **never** hits public OSM (`fm-map-offline-only=1`); blank + hint if tile pack missing |
| `mob-offline-pmtiles` | 2026-06-29 | `public/js/map-offline-pmtiles.js`, `map-offline-tiles.js`, `mobility-map-gis.js`, `public/index.html`, `public/locales/en.json`, `scripts/BUILD-LAB-OFFLINE-MAPS.ps1`, `scripts/fetch-singapore-tiles-bootstrap.js`, `scripts/fetch-lab-pmtiles-sample.js` | Offline raster + MapLibre **PMTiles 3D buildings** overlay on Leaflet; lab meta `fm-map-offline` / `fm-map-vector-pmtiles` |
| `mob-live-cap-8` | 2026-06-29 | `server.js`, `lib/sosInviteQueue.js`, `public/js/video-wall.js`, `video-config.js`, `video-matrix.js`, `fleet-ui.js`, `public/index.html`, `public/locales/*.json`, `.env` | Concurrent live **6 → 8** — wall slots, map pins, SOS pool, server `DASHBOARD_MAX_LIVE` |
| `mob-geofence-persistent-breach` | 2026-06-29 | `server.js`, `public/index.html`, `public/locales/*.json` | Map pin stays **OUT** (orange pulse) while BWC is outside geofence; clears on re-enter or fence clear |
| `mob-8wc-v1-lock` | 2026-06-29 | `baseline/2026-06-29-8wc-v1/*`, `BASELINE-8WC-V1.md`, `RESTORE-8WC-V1.ps1`, `VERIFY-8WC-V1.ps1` | **8wc-v1** baseline — 2196 files, SHA256 verify, full restore |
| `mob-voice-only-sdk-a` | 2026-06-29 | `server.js` | SDK §8 Fleet ☎: reject AV dial-back INVITE; stop unwatched live before voice-only |
| `mob-voice-only-sdk-b` | 2026-06-30 | `lib/mediaSession.js` | Symmetric RTP: retarget HQ→BWC TX to BWC source port after first RX; log `voice call tx retarget` |
| `mob-voice-broadcast-trial` | 2026-06-30 | `.env`, `server.js` | Lab Fleet ☎ → **broadcast** dial-back; accept AV callback INVITE, answer audio-only (revert sdk-a 488) |
| `mob-voice-only-sdk-c` | 2026-06-30 | `lib/sdpMedia.js` | Outbound Talk INVITE: `a=recvonly` → `a=sendrecv` (full-duplex SDP per §8) |
| `mob-wall-slot-isolation` | 2026-06-30 | `public/js/video-wall.js` | Per-panel play/stop: no `activeCamId` clone; stop one slot won't kill same cam on other panels/pins |
| `mob-sos-ack-ptt-restore` | 2026-06-30 | `server.js`, `public/index.html` | SOS ack → server pushes PTT team when helpers checked; UI waits for `pttTeam` |
| `mob-sos-hq-group-ptt` | 2026-06-30 | `public/js/video-wall.js` | HQ hold PTT talks to full SOS response team (not 1:1 only) |
| `mob-sos-ack-dismiss-after-ptt` | 2026-06-30 | `public/index.html` | Dismiss SOS banner after ack — PTT team stays up (`keepPttTeam`) |
| `mob-sos-ptt-team-end` | 2026-06-30 | `public/index.html` | PTT groups: **SOS response team** + **End response team** |
| `mob-enterprise-compose` | 2026-06-30 | `docker/docker-compose.enterprise.yml` | Valkey 8 + Postgres 16 (Wave 0 — Fleet not wired) |
| `mob-trial-manuals-sos-ptt` | 2026-06-30 | `scripts/trial-ship/manuals-src/*`, `docs/trial-ship/manuals*` | SOS PTT docs + HTML/PDF regen (`render-manuals-html-pdf.js`) |
| `mob-8wc-v2-lock` | 2026-06-30 | `baseline/2026-06-30-8wc-v2/*`, `BASELINE-8WC-V2.md`, `RESTORE-8WC-V2.ps1`, `VERIFY-8WC-V2.ps1` | **8wc-v2** baseline — **2319** files, SHA256 verify (v1 archived) |

**Current restore:** `.\VERIFY-8WC-V2.ps1` · rollback: `RUN RESTORE-8WC-V2` (AI) or `.\RESTORE-8WC-V2.ps1` (you). Pre–SOS PTT: `RUN RESTORE-8WC-V1`.

---

## Run lab

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\mobility-8bwc-lab"
npm install   # if node_modules missing
.\RESTART-FLEET.bat
```

Use a **different port** or stop the ship Fleet if both run on the same machine.

### Offline maps (Lane B)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\mobility-8bwc-lab"
.\scripts\BUILD-LAB-OFFLINE-MAPS.ps1 -AllDemo2   # 7 countries, 11 regions
# Or: -Countries cn   /   -Regions za-cpt   /   -ListOnly
.\RESTART-FLEET.bat
```

Raster tiles land in `data/gis/offline/tiles/`. PMTiles needs the [pmtiles CLI](https://github.com/protomaps/go-pmtiles/releases) or drop `*.pmtiles` into `data/gis/offline/pmtiles/`. Toggle **3D buildings** on the map toolbar after restart.

---

## Next (MOB DISC — not started)

- `mob-env-enterprise` — Fleet reads Valkey/Postgres from compose
- WVP + ZLM sidecar (separate folder, not merged into lab app)
- Optional: `mob-sos-ack-pin-linger`, `mob-geofence-voice-alert`
