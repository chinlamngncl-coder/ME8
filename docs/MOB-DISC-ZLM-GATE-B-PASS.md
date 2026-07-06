# MOB DISC — Gate B PASS (2026-07-06)

**Status:** **PASS** — operator confirmed; agent log-verified  
**Search:** `Gate B PASS`, `test-zlm`, `ZLM lab`, `relay transcode`

---

## What passed

| Check | Result |
|-------|--------|
| `test-zlm.html` plays live BWC via **ZLM FLV** | **PASS** (operator) |
| Green **zlm** badge, video visible | **PASS** |
| Command Wall still **FFmpeg / JSMpeg** (unchanged) | **PASS** |
| `liveStreamPool.js` / `video-wall.js` untouched | **PASS** |

**Devices tested:** Chin `34020000001329000008`, kk `34020000001329000009` (relay logs for both at 12:44).

---

## Agent verification (fleet.log + ZLM API)

**12:44:25** — Chin relay: ws connected → first frame → **no** `ffmpeg exit` / `relay stopped` (contrast FAIL at 12:39:44).

**12:44:35** — kk relay: same pattern.

**ZLM `getMediaList`:** streams `live/34020000001329000008` and `live/34020000001329000009` registered; reader count ≥1 on kk during play.

**ZLM health:** `zlm health ok` — secret synced (`FM_ZLM_SECRET` ↔ `docker/zlm-config/config.ini`).

---

## Fixes that unlocked Gate B (this session)

| Issue | Fix | File |
|-------|-----|------|
| `Please login first` / `zlmHealthy=false` | Sync API secret with ZLM container | `.env`, `docker/zlm-config/config.ini` |
| FLV player error ~15s, relay dies | Transcode mpeg1 TS → H.264 FLV (not `-c:v copy`) | `lib/zlmLabRelay.js` |

---

## Gate B scope (locked — what shipped)

**New / lab-only (no pool hooks):**

- `lib/zlmProcess.js`, `lib/zlmIngestLab.js`, `lib/livePlaybackBroker.js`, `lib/zlmLabRelay.js`
- `public/test-zlm.html`
- `server.js` routes behind `FM_LAB_ZLM=1` only
- `docker/zlm.compose.yml` + config — **builder lab bench**, not operator ship path

**Not started:** Gate C (adapter wire), Gate D (wall player), internal FLV proxy (off 8080).

---

## Next gates (do not start without MOB + approval)

| Gate | What |
|------|------|
| **C** | `liveMediaAdapter` + broker in start-video; dashboard still JSMpeg |
| **D** | Wall/pin use playback descriptor — checkpoint ritual |
| **Ship** | ZLM binary inside customer pack; no Docker for operator |

**Git:** Gate B genre ready to batch-commit when you say `MOB-APPLY lab-git-push-zlm` (or equivalent).

---

## Related

- `docs/MOB-DISC-ZLM-GATE-B-NO-VIDEO.md` — mpeg1/copy root cause (resolved)
- `docs/MOB-DISC-ZLM-ARCHITECTURE-PROPOSAL.md` — gate plan
- `docs/MOB-DISC-ZLM-NOT-READY.md` — pool-hook FAIL history (still valid for Gate C+)
