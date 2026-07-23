# MOB DISC — Soft Open UI / FLV / Stop (three MOBs, one at a time)

**Date:** 2026-07-17  
**Context:** After `mob-proxy-symmetric-nat-invite-v1`, SIP proves **PASS** (`200 OK from cam → WVP` + Fleet `live broker wvp-zlm primary`). Remaining FAIL is dashboard player / pin ghost / stop not BYE.

**Rule:** Operator applies **one named MOB at a time**. Agent does **not** edit until `MOB-APPLY <exact-id>`.

---

## Queue (order locked)

| # | MOB id | Problem | Intent |
|---|--------|---------|--------|
| 1 | `mob-wvp-zlm-flv-player-error-v1` | A — Player error | FLV URL usable from browser; ZLM CORS; prove media actually arrives |
| 2 | `mob-ui-ghost-pin-cleanup-v1` | B — Ghost dark patch | Tear down pin video host / overlay on player error + stop |
| 3 | `mob-wvp-softopen-stop-bridge-v1` | C — Stop live | Stop → WVP `stopPlay` so SIP BYE reaches cam |

---

## Code map (pre-APPLY — read-only)

### MOB 1 — Player error

| Piece | Today |
|-------|--------|
| Broker | `lib/livePlaybackBroker.js` returns `flvUrl` = prefer `play.flvUrl` (Node proxy `/api/lab/wvp/flv?…`) then `directFlv` / `upstreamFlv` |
| Host rewrite | `lib/wvpLabClient.js` `rewriteStreamHost` + `cfg().streamHost` default `FM_WVP_STREAM_HOST` \|\| `HOST` \|\| `192.168.1.38` |
| Player | `public/js/live-player-factory.js` `softAttachZlmOverlay` → mpegts FLV on `absolutizeUrl(desc.flvUrl)` |
| Soft Open wall | `video-wall.js` `attachCanvasPlayerWvpSoftOpen` — onFail sets Player error; overlay destroy only |
| ZLM CORS | `docker/wvp/zlm-modern/config.ini` `[http]` — **confirm `cors=1` present** (may be missing) |

**Likely APPLY checks (not yet done):**

1. Log / dump the exact `flvUrl` handed to UI (proxy vs `http://127.0.0.1:18088/...` vs LAN).
2. If any path still emits `127.0.0.1` / Docker bridge to browser → force rewrite to LAN (`192.168.1.38` lab).
3. Set ZLM `[http] cors=1` in the active lab config + restart ZLM if needed.
4. Operator/agent: ZLM logs for stream timeout / empty track (SIP OK but no media).

**Do not guess 172.x** as stream host.

### MOB 2 — Ghost pin

| Piece | Today |
|-------|--------|
| Pin attach | `video-wall.js` `attachMapPopupPlayer` + pin ZLM overlays `zlmPinOverlays` / `destroyZlmPinOverlay` |
| Soft fail | Overlay `cleanupOverlayOnly` removes `<video>`; pin may leave streaming label / black host / CSS class |

**Likely APPLY:** on player `error` / Soft Open fail / stop-video UI path → `destroy()` + remove pin host chrome that leaves the dark rectangle (label / class / empty stage). Touch only named pin/wall cleanup paths — Firmware Gold cores stay locked unless this MOB explicitly names the file.

### MOB 3 — Stop bridge

| Piece | Today |
|-------|--------|
| Socket | `server.js` `stop-video` → `releaseCamStreamWhenUnwatched` |
| Release | stops **Fleet** `liveStreamPool` only — **does not** call `wvpLab.stopPlay` |
| WVP API | `wvpLabClient.stopPlay` → `GET /api/play/stop/{device}/{channel}` already exists |

**Likely APPLY:** when Soft Open / WVP-ZLM path was used (or always when `FM_LAB_WVP=1` and WVP play was started for cam), on stop also `await wvpLab.stopPlay(camId)` so WVP sends BYE.

---

## Operator APPLY phrases

```
MOB-APPLY mob-wvp-zlm-flv-player-error-v1
```

Then after PASS/FAIL:

```
MOB-APPLY mob-ui-ghost-pin-cleanup-v1
```

Then:

```
MOB-APPLY mob-wvp-softopen-stop-bridge-v1
```

---

## Status

**MOB 1 APPLIED — FAIL (operator)** — `mob-wvp-zlm-flv-player-error-v1`  
**MOB 2 APPLIED** — `mob-ui-ghost-pin-cleanup-v1`  
**MOB 3 APPLIED** — `mob-wvp-softopen-stop-bridge-v1` (2026-07-17)

Pack complete for apply. FLV picture still open (MOB 1 FAIL).
