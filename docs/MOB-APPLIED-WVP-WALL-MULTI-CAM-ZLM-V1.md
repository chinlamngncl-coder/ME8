# MOB APPLIED — `mob-wvp-wall-multi-cam-zlm-v1`

**Date:** 2026-07-16  
**Status:** APPLIED  
**Named file:** `public/js/video-wall.js` (soft ZLM gate only — no pin mirror / PTT / SIP rewrite)  
**Cache:** `public/index.html` → `video-wall.js?v=20260716-multi-cam-zlm`  
**Parent:** `docs/MOB-DISC-WVP-ZLM-PRIORITY-NOT-FFMPEG.md`  
**Honesty:** `docs/MOB-DISC-WVP-FFMPEG-SOAKS-WERE-NOT-ZLM.md`

---

## Goal

Open All / **2+ BWC** wall live can soft-upgrade to **WVP-ZLM**.  
Fleet FFmpeg/JSMpeg stays underneath as fallback only — not the silent primary for multi-cam.

---

## What changed

`wallZlmSoftUpgradeAllowed()` previously returned **false** when:

- Open All reserved ids present, or
- Open All occupied slots, or
- `wallActiveCamIds().length > 1`

So every real multi-cam soak stayed on Fleet invite/pool → operator thought ZLM, logs said FFmpeg.

**Now:** allowed whenever `Me8LivePlayerFactory` soft-ZLM helpers exist.  
`scheduleWallZlmSoftUpgrade` staggers by slot (`2200 + slotKey*450` ms) to reduce WVP `startPlay` herd.

Still: JSMpeg under overlay; pin mirror unchanged; on ZLM fail → keep JSMpeg / request FFmpeg descriptor.

---

## Operator check (honest)

1. Hard refresh dashboard (new `?v=20260716-multi-cam-zlm`).  
2. Open **2 BWC** live (or Open All).  
3. Wait ~3–6s per tile for soft overlay.  
4. Log must show **`live broker wvp-zlm primary`** for each cam (or `live broker fallback` with reason — then it is **not** ZLM).  
5. If only `invite requested` / `pool rtp` and **no** `wvp-zlm primary` → still FFmpeg underneath without successful ZLM primary — **FAIL for this MOB’s goal**.

---

## Not changed

- `attachMapPopupPlayer` / `startMapMirrorFromWall` / pin dual-JSMpeg rules  
- PTT / SIP cores  
- Broker primary logic (already prefers WVP when `FM_LAB_WVP=1`)

---

## Rollback

Restore previous `wallZlmSoftUpgradeAllowed` multi-cam / Open All early returns in `video-wall.js`; revert cache bust string.
