# MOB-APPLIED — Backend video WVP handoff V1

**APPLY:** `MOB-APPLY-BACKEND-VIDEO-WVP-HANDOFF-V1`  
**Date:** 2026-07-20  
**Frontend:** **frozen** — no `public/**` edits

---

## What landed

| Piece | Behavior |
|-------|----------|
| `FM_WVP_VIDEO_HANDOFF=1` | On (classic `FM_LAB_WVP` stays **0**) |
| `start-video` | **Skip** Fleet SIP INVITE → WVP `startPlay` → `video-stream-ready` |
| `/api/live/playback` | Broker prefers WVP handoff → `engine: zlm` + **absolute** `flvUrl` |
| Stop | `stopWvpSoftOpenBridge` → WVP `stopPlay` |
| **5060** | **Unchanged** |

Files: `lib/wvpVideoHandoff.js`, `lib/livePlaybackBroker.js`, `lib/wvpLabClient.js` (`isEnabled`), `server.js`, `.env`

---

## Operator smoke

1. Hard refresh (classic UI)  
2. Cams on WVP platform **5060** / `4401020049` / `44010200492000000001` / `admin123`  
3. Open **one** live tile — expect picture via soft ZLM overlay (not Fleet 408)  
4. Log: `invite skipped` `wvp_video_handoff` + `wvp video handoff start`  
5. Cold SOS still OK (ACL)  

**Note:** Open All / multi-tile soft-ZLM may still be weak (frozen UI only soft-upgrades single wall). PTT still separate APPLY.

## Ports (unchanged SIP door)

| Item | Value |
|------|--------|
| GB / WVP SIP | **`:5060`** |
| Dashboard | **`:3988`** |
| WVP UI | **`:18080`** |
| ZLM HTTP-FLV | **`:18088`** |
| Fleet SIP | **`:5062`** |
| PTT | **`:29201`** |
