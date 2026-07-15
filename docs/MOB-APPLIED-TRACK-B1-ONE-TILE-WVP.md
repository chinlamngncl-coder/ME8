# MOB — one Fleet tile plays WVP (fast path)

**Status:** APPLIED 2026-07-14 — `mob-track-b1-one-tile-wvp-play`  
**Not touched:** wall / Open All / `liveStreamPool` / pool FFmpeg / `FM_LAB_ZLM` (stays **0**)

## What you get

One lab page inside Fleet login:

**http://192.168.1.38:3988/test-wvp-tile.html**

Server talks to WVP → starts play → proxies FLV through Fleet → browser shows **one** tile (same speed class as WVP Play).

## Files

| File | Role |
|------|------|
| `lib/wvpLabClient.js` | WVP login / devices / play / FLV proxy |
| `server.js` | `/api/lab/wvp/*` when `FM_LAB_WVP=1` |
| `public/test-wvp-tile.html` | One-tile UI |
| `.env` | `FM_LAB_WVP=1` (+ WVP base/user) |

Ship packs **strip** `test-wvp-tile.html` (lab only).

## You prove (one test)

1. WVP lab up (`START-WVP-LAB.bat`) — host **:80** still mapped for play URLs  
2. `RESTART-FLEET.bat` → hard refresh  
3. Point **one** GB cam at LAN IP, SIP **5061** (leave others on **5060**)  
4. Login Fleet → open `http://192.168.1.38:3988/test-wvp-tile.html`  
5. Refresh devices → Play  
6. Reply **PASS** or **FAIL**  
7. Put that cam back on Fleet **5060**

## Forbidden (still)

Stuffing this into command wall / Open All. That is a later step.
