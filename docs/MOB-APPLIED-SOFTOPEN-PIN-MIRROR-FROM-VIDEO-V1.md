# MOB-APPLIED: mob-softopen-pin-mirror-from-video-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**Prior:** Soft Open **wall** picture PASS; pin no video / Chin “BWC offline” / kk Live streaming OSD

## Mandate

When Soft Open wall shows live mpegts `<video>`, the map pin must show the same picture (mirror), not stay empty or stuck on offline / streaming OSD.

## Root cause

1. Firmware Gold pin mirror copies wall **canvas** only — Soft Open has no JSMpeg canvas.  
2. `wallSlotDecodedForCam` required `players.has(idx)` — Soft Open never sets JSMpeg players.  
3. Chin pin “BWC offline” = Fleet online check; Soft Open live is WVP — offline popup has **no** `.map-pin-video` host to mirror into.

## What changed

| Piece | Change |
|-------|--------|
| `public/js/video-wall.js` | `wallSoftOpenVideoForCam` / `wallMirrorSourceForCam`; `startMapMirrorFromWall` draws canvas **or** `<video>`; Soft Open counts as decoded live; Soft Open `onProven` → pin chrome + `syncMapPopupPlayer` |
| `public/index.html` | `isCamOnlineOnFleet` true when Soft Open wall decoded; `ensureSoftOpenPinLiveChrome` rebuilds offline popup → live video chrome |
| `public/js/dashboard-boot.js` | Same helpers kept in sync (boot file; live path is index inline) |
| Cache | `video-wall.js?v=20260717-softopen-pin-mirror` |

Fleet JSMpeg canvas mirror path unchanged when Soft Open is not used.

## Pass / fail (Chin)

1. Hard refresh once.  
2. Soft Open **Chin**.  
3. Wall picture OK (regression).  
4. Open / look at **Chin pin**.

| Pass | Fail |
|------|------|
| Chin pin shows live picture (mirror of wall) | Pin empty / still BWC offline box / stuck Live streaming… |
| No second WS / no dual JSMpeg for Soft Open | Pin opens its own broken player |

kk ghost OSD: out of scope unless Chin pin PASS and kk still wrong → next MOB.

## One line

**Soft Open pin = RAF mirror from wall mpegts video (+ offline popup → live chrome).**
