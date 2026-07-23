# MOB APPLIED — POPOUT-CLOSE-SAFE-V1

**Date:** 2026-07-20  
**Status:** APPLIED — operator test pending  
**Disc:** `MOB-DISC-POPOUT-CLOSE-SAFE-V1-20260720.md`

---

## Goal

Close matrix or panel popout (X / window close) must **not** stop the BWC on the main ops wall or map pin — same semantics as Command Wall close.

Stop ■ in popout unchanged (still stops that cam on the wall via opener / popout ref release).

---

## Changes

| File | Change |
|------|--------|
| `lib/liveViewers.js` | Surfaces `matrix-popout`, `live-popout`; ref breakdown + socket surface map |
| `server.js` | Log `remainingMatrixPopout` / `remainingLivePopout` on stop-video |
| `public/matrix.html` | `SURFACE = 'matrix-popout'`; `viewerRefHeld` per cell; Close/beforeunload → destroy player + release popout ref only |
| `public/live.html` | `SURFACE = 'live-popout'`; `viewerRefHeld`; opener FLV attach when parent live (no start-video); Close/beforeunload safe |

---

## Behavior

1. Popout `start-video` / `stop-video` use **popout surfaces** — separate ref-count from `ops`.
2. When parent wall already has FLV (`getOpenerFlvUrl`), popout attaches locally **without** holding a viewer ref.
3. **Close (X) / beforeunload:** destroy local player; `stop-video` only if popout held its own ref (`viewerRefHeld`).
4. **Stop ■:** unchanged — still emits stop on popout surface (and matrix Stop still delegates to opener wall stop).

---

## Operator test

1. Restart lab console (server picks up `liveViewers.js`).
2. Start live on ops panel for one BWC (wall + pin visible).
3. Open **panel popout** (`live.html?stream=1`) → picture OK → **Close (X)** → parent panel + pin **stay Live**.
4. Open **matrix popout** → picture OK → **Close** → parent wall slots **stay Live**.
5. Optional: Stop ■ in popout still stops cam on wall (expected).

---

## Next

Phase **6:** `MOB-APPLY PIN-FLV-MIRROR-HARDEN-V1`
