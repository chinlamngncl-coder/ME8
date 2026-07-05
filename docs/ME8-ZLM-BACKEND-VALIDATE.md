# ME8 — ZLM backend validate (step 1)

**MOB:** `mob-me8-zlm-backend-validate`  
**Scope:** ZLM sidecar + ingest + FLV playback in a **standalone lab page only**.  
**Out of scope:** `video-wall.js`, pin, ops wall player adapter.

---

## Why

Prove ZLM ingest and FLV before any dashboard player work (`mob-me8-fleet-video-player`).

---

## 1 — Enable ZLM in lab `.env`

Copy the block from `.env.me8.example` (section **mob-me8-zlm-backend-validate**) into `.env`:

| Key | Lab value |
|-----|-----------|
| `FM_ZLM_ENABLED` | `1` |
| `FM_ZLM_AUTOSTART` | `1` |
| `FM_ZLM_HTTP_URL` | `http://127.0.0.1:8080` |
| `FM_ZLM_SECRET` | same as ZLM `[api] secret` |
| `FM_LIVE_ENGINE` | `zlm` |
| `FM_LIVE_FALLBACK_FFMPEG` | `1` |

Start ZLM (pick one):

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
docker compose -f docker/zlm.compose.yaml up -d
# or: scripts\me8-ship\Start-Me8ZlmSidecar.ps1
```

Verify sidecar:

```powershell
.\VERIFY-ZLM-SIDECAR.ps1
.\RESTART-FLEET.bat
```

---

## 2 — Standalone FLV test page

Open **on the Fleet machine** (localhost only):

```
http://127.0.0.1:3988/lab/zlm-flv-test.html
```

Optional query: `?camId=34020000001329000009`

1. Start live on a BWC from the normal dashboard (wall still uses JSMpeg — expected).
2. Enter camId → **Refresh status** → checklist should move to PASS items.
3. **Play FLV (lab proxy)** — video in the test page `<video>` element.

Bench API (same host, localhost only):

```
GET /api/lab/zlm-bench?camId=<camId>
GET /api/lab/live/flv?camId=<camId>
```

Optional script:

```powershell
.\VERIFY-ZLM-BACKEND.ps1 -CamId 34020000001329000009
```

(Fleet must be running; live must be active for cam-specific checks.)

---

## 3 — Log expectations (Fleet console / media log)

When ZLM is **on** and live starts:

| Log | Meaning |
|-----|---------|
| `zlm ingest attached` | RTP mirror registered |
| `zlm ingest first rtp` | Packets reaching ZLM port |
| `zlm stream ready` | ZLM published FLV |
| `zlm failover` | Silent ffmpeg fallback (wall unchanged) |

When ZLM is **off** (`FM_ZLM_ENABLED=0`, `FM_LIVE_ENGINE=ffmpeg`):

| Log | Meaning |
|-----|---------|
| `zlm ingest skip` · `reason: disabled` | Expected — ffmpeg-only path |
| Wall live still works | ffmpeg fallback OK |

---

## PASS gate (CHECKPOINT)

| # | Check |
|---|--------|
| B1 | `VERIFY-ZLM-SIDECAR.ps1` → PASS |
| B2 | `/api/lab/zlm-bench` → `config.enabled: true`, `zlm.ok: true` |
| B3 | Live running → logs show **`zlm ingest attached`** (not `disabled`) |
| B4 | Same session → **`zlm ingest first rtp`** then **`zlm stream ready`** |
| B5 | `zlm-flv-test.html` → **Play FLV** shows moving video |
| B6 | ZLM off in `.env` + restart → wall live still OK (ffmpeg) |

Reply **CHECKPOINT PASS** or **CHECKPOINT FAIL** + one line.

---

## Next MOB (after PASS)

`mob-me8-fleet-video-player` — new adapter file; still no engine branches in `video-wall.js`.

**Plan:** [ME8-ZLM-LIVE-MVP.md](./ME8-ZLM-LIVE-MVP.md)
