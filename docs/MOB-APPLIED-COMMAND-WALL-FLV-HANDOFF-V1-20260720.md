# MOB-APPLIED — Command Wall FLV handoff

**Date:** 2026-07-20  
**MOB:** `MOB-APPLY-COMMAND-WALL-FLV-HANDOFF-V1`  
**Scope:** `public/js/command-wall.js`, `public/index.html`, `public/command-wall.html` (popout scripts + CSS).  
**Operator test:** **PASS** (2026-07-20).

---

## Problem

With `FM_WVP_VIDEO_HANDOFF=1`, server sends `video-stream-ready { wvpVideoHandoff, flvUrl }` for surface `command-wall`. Command Wall only attached **JSMpeg** on `startSlot` → eternal **Connecting…** while ops wall FLV worked.

---

## Change

| Piece | Change |
|-------|--------|
| `attachWvpHandoffFlvToSlot` | Same factory as ops wall — `Me8LivePlayerFactory.attachFlvPrimary` |
| `video-stream-ready` | Handoff path → FLV; classic path → JSMpeg unchanged |
| `startSlot` | Emit `start-video`, show Connecting, **wait** for ready (no blind JSMpeg on handoff) |
| `attachLivePlayerForSlot` | Cached `flvUrl` → FLV; else JSMpeg |
| `destroyPlayer` | Tear down FLV `<video>` + canvas |
| Popout `command-wall.html` | Load `mpegts.min.js` + `live-player-factory.js` |
| CSS | `video.me8-zlm-primary` in embedded + popout cell stage |

Classic handoff-off path unchanged (JSMpeg on `flvUrl` absent).

---

## Cache bust

- `index.html`: `command-wall.js?v=20260720-cw-flv-handoff-v1`
- `command-wall.html`: same + vendor mpegts + live-player-factory

---

## Operator test

1. Hard refresh (Ctrl+Shift+R) on Operations **and** Command Wall popout if used.
2. Handoff on (`FM_WVP_VIDEO_HANDOFF=1`).
3. Command Wall tab → drag one online BWC → Play (or auto-start).
4. **PASS:** Connecting → **Live** with picture within ~10s (same cam as ops wall).
5. Stop → slot clears; no frozen Connecting.
6. Optional: handoff off → JSMpeg path still works on classic lab.

---

## Next (locked order + parked voice)

| # | MOB | Notes |
|---|-----|--------|
| 3 | `FR-LIVE-WATCH-FLV-HANDOFF-V1` | FR analytics tiles |
| 4 | `PIN-FLV-MIRROR-HARDEN-V1` | Map pin |
| — | `SOS-GROUP-FIELD-RX-RELAY-V1` | BWC→BWC field PTT (disc — not in video order) |
| — | `WVP-REBOOT-BRINGUP-ONE-BAT-V1` | Reboot glue |
| — | Call / intercom on WVP-homed cams | Separate voice arc — not this MOB |
