# MOB-APPLIED — 8-GLASS-FORTRESS-CONSOLIDATION-V6 (2026-07-28)

## Goal

Architectural hardening: in-memory SIP bridge cascade (no `.env` writes), Setup PIN, hardware clock sanity, port bind retry, SIP port sanitize, IT manual.

## Landed

| Piece | Path |
|-------|------|
| Glass Fortress logger | `lib/glassFortressLog.js` |
| Listen retry (5×1s) | `lib/listenRetry.js` |
| SIP bridge cascade + spawn | `lib/sipBridge.js` |
| UDP send trap + loop guard | `scripts/wvp-sip-lan-proxy.js` |
| Setup PIN + API gate | `lib/setupOnlyServer.js`, `public/setup-boot.html` |
| Clock sanity ≥ 2026-01-01 | `lib/timeAnchor.js` → `HARDWARE_CLOCK_INVALID` |
| Wire bridge + gate messaging | `bin/me8-server.js`, `server.js` |
| `sip.sipPort` 1024–65535 | `POST /api/server-settings` |
| IT guide | `docs/IT-ADMIN-MANUAL.md` |

## Safety

- **Does not** delete or rewrite `.env` / `.env.template` for SIP bridge ports (memory cascade only).
- Network-tier Setup save may still update `ME8_NETWORK_TIER` in `.env` (existing behavior).
- Target host forced to `127.0.0.1`.
- Listen === target → refuse start (Glass Fortress).

## Hotfix 2026-07-28 (operator FAIL)

Bridge must **not** bind Settings `sip.sipPort` / `FM_GB28181_SIP_PORT` (Fleet, often **5062**). That stole Fleet’s port → `EADDRINUSE 0.0.0.0:5062` → service PAUSED → `:4438` refused.

**Listen cascade (fixed):** `WVP_SIP_PROXY_LISTEN` → else **5060** only.

**Target remap (fixed):** if `.env` still has legacy `WVP_SIP_PROXY_TARGET=…:15061`, bridge uses **`127.0.0.1:5061` in memory** (current Docker publish). Does not rewrite `.env`. Stale 15061 caused `wvp_stream_timeout` / no live picture while cams still looked online.

## Operator smoke

1. `node bin/me8-server.js --safe-mode` → console shows Setup PIN → open `http://127.0.0.1:13988` → enter PIN → tier/license works.  
2. Wrong PIN → 401.  
3. Full boot with license → `[sip-bridge] started` (or Glass Fortress if loop/port conflict).  
4. Settings SIP port `80` or `70000` → HTTP 400.
