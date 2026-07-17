# MOB APPLIED — git-restore-softopen-storm-files-only

**Date:** 2026-07-17  
**APPLY:** `MOB-APPLY git-restore-softopen-storm-files-only`  
**From:** `HEAD` = `9155950` (same tree for these files as pre Soft Open UI storm)

## Restored (Soft Open storm only)

- `public/js/video-wall.js`
- `public/js/live-player-factory.js`
- `public/js/wvp-lab-tile.js`
- `public/js/dashboard-boot.js`
- `lib/livePlaybackBroker.js`
- `lib/wvpLabClient.js`
- `lib/zlmIngestLab.js`
- `lib/zlmLabRelay.js`
- `docker/wvp/docker-compose.wvp.yml`
- `docker/wvp/wvp-config/application-modern.yml`
- `docker/wvp/zlm-modern/config.ini`
- `scripts/START-WVP-LAB.ps1`

## NOT touched (keep)

- Redact UI / FR (`evidence-hub`, face libs, Seeta sidecars, …)
- `public/index.html` / `server.js` (safety commit freeze)
- `.env` (still Soft Open-only off + WVP presence on)

## Honest limit

Restoring storm files removes Soft Open **UI band-aids**.  
With `FM_LAB_WVP=1`, broker may still prefer WVP picture (one-row :5060). Classic Fleet SIP live needs Path B (cam → :5062) later.

## Operator

1. Restart Fleet  
2. Hard refresh (cache bust)  
3. TEST: online, live, SOS, PTT, redact → **PASS** / **FAIL**

## NEXT

If still WVP-only live / SOS broken → Path B paper:

```text
MOB DISC bwc-rekey-fleet-sip-5062
```

Or say what failed.
