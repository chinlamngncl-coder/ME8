# MOB — WVP tile prefer ws-flv (root path)

**Status:** APPLIED 2026-07-14 — `mob-wvp-tile-ws-flv-player`  
**Scope:** lab WVP tiles + play payload. No wall / Open All.

## Change

- Play returns `wsFlv` (host-rewritten) + `preferWs` (default on: `FM_WVP_WS_FLV=1`)
- Tile play order: **ws-flv → HTTP direct → Fleet proxy** (chain fallback on error)
- Reopen stays as **safety only** (not the root claim)
- Cache: `wvp-lab-tile.js?v=20260714-ws-flv`

Disc: `docs/MOB-DISC-WVP-TILE-WS-FLV-PLAYER.md`

## You prove

1. **Restart Fleet** (server payload change)
2. Hard refresh dashboard
3. Play A + B — panel log should show `ws-flv ws://192.168.1.38/...` first
4. Leave **> 30 min**
5. Both stay live without constant blink = **PASS**; dies / reopen every few min = **FAIL**
