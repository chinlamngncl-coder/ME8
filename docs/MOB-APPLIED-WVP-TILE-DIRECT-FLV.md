# MOB — WVP tile direct ZLM FLV (cut proxy hop)

**Status:** APPLIED 2026-07-14 — `mob-wvp-tile-direct-flv`  
**Scope:** lab WVP tiles + `wvpLabClient` play payload. No wall / Open All.

## Change

- Play returns `directFlv` (ZLM URL) + proxy `flvUrl`
- Default prefer direct (`FM_WVP_DIRECT_FLV` ≠ `0`)
- Tile tries **direct-zlm** first; on mpegts error → **proxy-fallback**
- Agent checked lab CORS: ZLM `:80` returns `Access-Control-Allow-Origin` for Fleet origin

## You prove (PASS/FAIL from picture only)

**Where:** Fleet dashboard lab panel **Lab · WVP two tiles** (bottom-right) — not WVP website, not Open All.  
Plain steps: `docs/MOB-DISC-WVP-TILE-WHERE-TO-PLAY.md`

1. Cam(s) on WVP **5061**
2. Hard refresh once
3. **Play A** / **Play B**
4. Picture OK = **PASS**; broken or still badly late = **FAIL**

(Ignore “log” unless you want — it’s the small text inside that same panel.)

Force old path if needed: `.env` `FM_WVP_DIRECT_FLV=0` then restart.
