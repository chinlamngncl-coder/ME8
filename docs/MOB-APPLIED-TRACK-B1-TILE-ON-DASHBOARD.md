# MOB — WVP one tile on main dashboard (lab)

**Status:** APPLIED 2026-07-14 — `mob-track-b1-tile-on-dashboard`  
**Not touched:** command wall / Open All / pool FFmpeg / `video-wall.js` / `FM_LAB_ZLM` (stays **0**)

## What you get

After Fleet login on the **main dashboard**, a floating **Lab · WVP one tile** panel (bottom-right).

Uses the **same login cookie** as the dashboard — no separate page / session fight.

Visible **only** when `FM_LAB_WVP=1` (`body.fm-lab-wvp`). Default CSS = hidden.

## Files

| File | Role |
|------|------|
| `public/js/wvp-lab-tile.js` | Panel logic → `/api/lab/wvp/*` + mpegts FLV |
| `public/index.html` | Panel markup + CSS gate |
| `server.js` | `labWvp` on `/api/auth/session` + `server-capabilities` |

Still available (optional): `public/test-wvp-tile.html` — pack strips both HTML and `wvp-lab-tile.js`.

## You prove (one test)

1. WVP lab up (`START-WVP-LAB.bat`) — host **:80** mapped for play URLs  
2. `RESTART-FLEET.bat` → hard refresh browser  
3. Point **one** GB cam at LAN IP, SIP **5061** (others stay **5060**)  
4. Login Fleet at `http://192.168.1.38:3988`  
5. Bottom-right: **Lab · WVP one tile** → Refresh → Play  
6. Reply **PASS** or **FAIL**  
7. Put that cam back on Fleet **5060**

## Ship

- Panel hidden unless `FM_LAB_WVP=1` (customer env must not set it)  
- Pack deletes `test-wvp-tile.html` + `js/wvp-lab-tile.js`  
- Disc: `docs/MOB-DISC-WVP-TILE-NO-SHIP.md`

## Forbidden (still)

Stuffing this into command wall / Open All.
