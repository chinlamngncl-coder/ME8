# MOB-APPLIED — Panel popout FLV handoff (`live.html`)

**Date:** 2026-07-20  
**MOB:** `MOB-APPLY-PANEL-POPOUT-LIVE-FLV-HANDOFF-V1`  
**Scope:** `public/live.html` (ops panel popout window).  
**Operator test:** **PASS** (2026-07-20).

---

## Problem

With `FM_WVP_VIDEO_HANDOFF=1`, per-slot **pop-out** opens `/live.html` which only attached **JSMpeg** on connect — black / Connecting forever while parent ops wall FLV worked.

---

## Change

| Piece | Change |
|-------|--------|
| Scripts | `mpegts.min.js` + `live-player-factory.js` |
| `video-stream-ready` | Handoff → `attachFlvPrimary` on `.stage`; classic → JSMpeg |
| Connect / Play | Emit `start-video` with surface **`ops`**; wait for ready (no blind JSMpeg) |
| `stream=1` (parent live) | Still emits `start-video` — WVP reuses play + returns `flvUrl` |
| Stop / close | `stop-video` with surface `ops`; tear down FLV `<video>` |
| CSS | `video.me8-zlm-primary` — `object-fit: contain` (resolution-agnostic) |

Classic handoff-off path unchanged when `flvUrl` absent.

---

## Operator test

1. Hard refresh ops dashboard (Ctrl+Shift+R).
2. Handoff on (`FM_WVP_VIDEO_HANDOFF=1`).
3. Play one BWC on ops wall panel → click **pop-out** (↗ on slot).
4. **PASS:** Popout window shows **Live** picture within ~10s (same cam).
5. Stop in popout → window clears; parent wall still live unless you stop there too.
6. Optional: open popout on idle slot (no `stream=1`) → Play → picture.

---

## Next (locked order)

| Phase | MOB |
|-------|-----|
| 5 | `VIDEO-MATRIX-POPOUT-FLV-HANDOFF-V1` |
| 6 | `PIN-FLV-MIRROR-HARDEN-V1` |
