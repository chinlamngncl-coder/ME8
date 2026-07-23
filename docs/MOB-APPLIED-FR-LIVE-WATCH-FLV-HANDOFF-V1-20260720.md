# MOB-APPLIED — FR live watch FLV handoff

**Date:** 2026-07-20  
**MOB:** `MOB-APPLY-FR-LIVE-WATCH-FLV-HANDOFF-V1`  
**Scope:** `public/js/fr-live-watch.js`, `public/index.html` (cache bust + FR tile FLV CSS).  
**Operator test:** **PASS** (2026-07-20) — Chin + kk on FR live watch tiles.

---

## Problem

With `FM_WVP_VIDEO_HANDOFF=1`, server sends `video-stream-ready { wvpVideoHandoff, flvUrl }` for surface `analytics-fr`. FR live watch only attached **JSMpeg** on `startSlot` → eternal **Connecting…** while ops wall and Command Wall FLV worked.

---

## Change

| Piece | Change |
|-------|--------|
| `attachWvpHandoffFlvToSlot` | `Me8LivePlayerFactory.attachFlvPrimary` on tile host — `object-fit: contain`, resolution-agnostic |
| `video-stream-ready` | Handoff path → FLV; classic path → JSMpeg unchanged |
| `startSlot` | Emit `start-video`, show Connecting, **wait** for ready (no blind JSMpeg when handoff) |
| `attachLivePlayerForSlot` | Cached `flvUrl` → FLV; else JSMpeg (classic reuse) |
| `destroyPlayer` | Tear down FLV `<video>` + canvas |
| Signal timer retry | Re-emit `start-video`; attach only if stream already known |
| CSS | `.ax-fr-tile video.me8-zlm-primary` in `index.html` |

Classic handoff-off path unchanged (JSMpeg when `flvUrl` absent).

---

## Cache bust

- `index.html`: `fr-live-watch.js?v=20260720-fr-flv-handoff-v1`

---

## Operator test

1. Hard refresh (Ctrl+Shift+R) on Operations dashboard.
2. Handoff on (`FM_WVP_VIDEO_HANDOFF=1`).
3. Analytics Face panel → Live watch → add one online BWC to a tile.
4. **PASS:** Connecting → **Live** with picture within ~10s (same cam as ops wall).
5. Rotate / second tile — picture on each started cam.
6. Stop tile → clears; no frozen Connecting.
7. Optional: handoff off → JSMpeg path still works on classic lab.

---

## Next (locked order)

| Phase | MOB |
|-------|-----|
| 4 | `PANEL-POPOUT-LIVE-FLV-HANDOFF-V1` |
| 5 | `VIDEO-MATRIX-POPOUT-FLV-HANDOFF-V1` |
| 6 | `PIN-FLV-MIRROR-HARDEN-V1` |

Command Wall phase 2: **operator PASS** (2026-07-20).
