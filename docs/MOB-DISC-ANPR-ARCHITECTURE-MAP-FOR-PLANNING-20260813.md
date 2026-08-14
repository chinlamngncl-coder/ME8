# MOB-DISC ANPR architecture map (for planning) — 2026-08-13

**Audience:** product / Google planning. **No APPLY.** Facts from current ME8 code.

---

## 1. Snapshot & FTP flow

### ANPR “Snapshot” tab (Analytics → ANPR → Snapshot)

**Not** an automatic BWC FTP drop into ANPR.

- Operator **manually** picks a photo in the dashboard (drag/drop or file input).
- Frontend uploads to **`POST /api/analytics/anpr/read`** (multipart `photo`).
- Node (`anprPlateRead`) calls the **Python ANPR sidecar** to OCR.
- Node then runs **`anprPlateList.matchProbe`** (watchlist) and returns plate + list match to the UI.

### BWC / dock FTP (separate product path)

- Fleet runs an **FTP server** (`lib/ftpIngest`, settings in server) for **evidence / dock uploads** (and SOS snapshot linking).
- Files land under the configured **FTP root / evidence storage**, not as the primary ANPR Snapshot tab pipeline.
- Offline Match UI can list an **FTP inbox** via **`GET /api/ftp-inbox`** (browse + pick), then scan path (see §2).

**Answer for planners:**  
Snapshot ANPR today = **HTTP upload API**, not “FTP watcher → ANPR folder.”  
FTP exists for **dock/evidence** (and Offline inbox stub), not as the main Snapshot read path.

---

## 2. Offline Match flow

- UI: Analytics → ANPR → **Offline Match** (`anpr-image-investigation.js`).
- Modes: image investigation (+ FTP inbox cards) / optional video stub in UI.
- Trigger: **manual** — drop/select image → **Run scan**.
- Endpoint: **`POST /api/analytics/anpr/image-scan`** (wired in UI; treat as the offline scan API).
- Also can refresh inbox: **`GET /api/ftp-inbox`**.

**Answer:** Manual dashboard upload (and optional pick from FTP inbox), **not** Live Start watch.

---

## 3. Plate lists / watchlists (blacklist)

| Item | Where |
|------|--------|
| Storage | **Node.js** — `lib/anprPlateList.js` → files under `storage/anpr-plate-lists/index.json` (not inside Python) |
| Grades | `suspicious` / `wanted` / `blacklist` |
| CRUD API | `GET/POST /api/analytics/anpr/lists`, patch/delete by id (super-admin for write) |
| Match | **Node** calls `anprPlateList.matchProbe(plate)` after OCR |

**Python sidecar:** returns plate text + confidence (+ crops).  
**Node:** watchlist match + UI alerts (`anpr-list-hit` / rail badges).

---

## 4. Search & History

| Item | Where |
|------|--------|
| Handler | **Node** — `lib/anprCaptureHistory.js` |
| DB | **PostgreSQL** via `siteDb` (when DB ready) |
| APIs | `GET /api/analytics/anpr/history`, `GET .../history/:id`, `POST .../history` |
| Who writes | **Node** persists after live/offline finalize; Python does **not** own the history DB |

Live path sketch:

1. Python emits OCR hit (native watch events / read API).  
2. Node poller / read handler enriches + **matchProbe**.  
3. Node emits socket events to dashboard (`anpr-crop-tick` / list hit).  
4. Node **records** history row when capture is finalized.

---

## 5. Frontend ANPR sub-nav

In `public/index.html` — Analytics → ANPR:

| Sub-tab | `data-anpr-sub` | Panel id |
|---------|-----------------|----------|
| **Live** | `live` | `#ax-anpr-sub-live-panel` — Start watch / Stop all / tiles / Recent Plates |
| **Snapshot** | `snapshot` | `#ax-anpr-sub-snapshot-panel` — photo + Read plate |
| **Offline Match** | `offline` | `#ax-anpr-sub-offline-panel` |
| **Search & History** | `history` | `#ax-anpr-sub-history-panel` |
| **Plate lists** | `lists` | `#ax-anpr-sub-lists-panel` |

**Disabling Live only:** hide/disable Live sub-tab + Start watch / Stop all / live tiles / live socket watch — **leave Snapshot, Offline, History, Lists untouched.**

---

## One-page ownership (Google)

```
BWC Live FLV ──► Node start-video / WVP ──► Python native watch (OCR)
                      │                         │
                      │                         ▼
                      │                   plate text+conf
                      ▼                         │
              anprPlateList (Node JSON) ◄───────┘
                      │
                      ▼
         UI sockets + anprCaptureHistory (Postgres)

Manual photo ──► POST /api/analytics/anpr/read|image-scan ──► same Node match + history pattern

Dock FTP ──► evidence / ftp-inbox (not the Snapshot tab’s primary path)
```

---

## Planning notes (gaps / hatch)

- Offline `image-scan` UI exists; confirm production completeness vs Snapshot `read` when scoping Google work.  
- Live stream path is the hard one (WVP + native watch); Snapshot/Offline/Lists/History are Node+API oriented and safer to keep if Live is turned off.
