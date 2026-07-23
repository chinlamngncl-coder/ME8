# MOB APPLIED — FR-LIVE-GRAB-ZLM-HANDOFF-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY FR-LIVE-GRAB-ZLM-HANDOFF-V1`  
**Prior:** `FR-LIVE-DEAD-DIAGNOSE-V1` (root cause: mpeg1 pool gate under WVP handoff)  
**Disc:** `docs/MOB-DISC-LAB-FR-LEFTOVERS-THEN-SECURITY-20260723.md` (Stage L2 fix)

## What changed

WVP/ZLM handoff stays **ON**. FR stills no longer require the Fleet mpeg1 pool when a cam is already live on handoff.

| Piece | Change |
|-------|--------|
| `lib/frLiveProbe.js` | `grabJpegFromFlv` — ffmpeg one frame from ZLM HTTP FLV (loopback rewrite like wall listen); `grabJpegForFr` prefers FLV when handoff active |
| `lib/frLivePoller.js` | `isCamLiveForFr` = pool streaming **OR** handoff `isActive` + `getUpstreamFlv`; grabs call `grabJpegForFr` |

Env (optional): `FM_FR_FLV_GRAB_MS` default **2500** (800–8000).

## Not changed

- `FM_WVP_VIDEO_HANDOFF` — still ON  
- Seeta sidecar / match threshold  
- FR tile UI / FLV player  
- Classic path when handoff off (mpeg1 WS grab unchanged)

**Operator:** **PASS** 2026-07-23 — FR HIT + Recent snaps under WVP handoff.