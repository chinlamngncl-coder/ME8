# MOB-APPLIED — Video UI race and proxy fix

**APPLY:** `MOB-APPLY-VIDEO-UI-RACE-AND-PROXY-FIX`  
**Date:** 2026-07-20

---

## Step 1 — Same-origin FLV proxy (backend)

| Piece | Detail |
|-------|--------|
| Route | `GET /api/lab/wvp/flv-stream?camId=…` (dashboard auth + lab WVP gate) |
| Pipe | ZLM upstream `:18088` → dashboard origin `:3988` |
| Handoff URL | `video-stream-ready` + broker now emit **`/api/lab/wvp/flv-stream?camId=…`** (not direct `:18088`) |
| Files | `lib/wvpVideoHandoff.js`, `server.js` |

Log: `wvp video handoff start` · `flvProxy:/api/lab/wvp/flv-stream?camId=…` · `flvHost:192.168.1.38:18088` (upstream)

---

## Step 2 — Slot timing race (frontend)

| Fix | Detail |
|-----|--------|
| Cancel +300ms wipe | `cancelSlotRenderTimersForCam` when handoff FLV arrives |
| assignCamToSlot | Skip render timer if handoff FLV already known; mount FLV directly |
| Render callback | Bail if handoff ready or `video.me8-zlm-primary` already in stage |
| Slot index | Use `findSlotIndex(slotEl)` not forEach array index |
| File | `public/js/video-wall.js` |

---

## Step 3 — Browser diagnostics

Console lines in `attachFlvPrimary`:

- `[me8-flv] attach start` `{ url }`
- `[me8-flv] attach ok` `{ url }`
- `[me8-flv] attach fail` `{ url, reason }`

Wall: `[me8-flv] wall attach fail` if factory returns null.

Cache bust: `?v=20260720-flv-proxy-race-v1`

---

## Operator smoke

1. **Restart** UbitronC2 (new proxy route).
2. **Hard refresh** dashboard (`Ctrl+F5`).
3. Open **one** live tile.
4. DevTools console: expect `[me8-flv] attach start` with URL on **same origin** (`…:3988/api/lab/wvp/flv-stream?camId=…`).
5. Expect `[me8-flv] attach ok` and picture on wall.
6. Fleet log: `wvp flv-stream proxy open` when browser connects.

PTT still parked.
