# MOB DISC — Snapshot must be full face or half-body (not ugly half-face)

**Status:** **APPLIED** `mob-fr-snap-bust-crop` 2026-07-10  
**Search:** half face, ugly, rolling, bust, half body, full face, pad crop, `face_composition`  
**Related:** `MOB-DISC-FR-HALF-FACE-RAIL-FIX.md` (edge-clip), `MOB-DISC-FR-SNAP-FULL-FACE-OR-BUST.md`

---

## Operator rule (locked)

Snapshot = **full face (padded)** or **half-body/bust**. Never tight ugly half-face on rolling rail.

---

## Shipped

| Piece | Change |
|-------|--------|
| `fr-sidecar/app.py` | Display crop pads face → bust / full-face; embedding still from face detect |
| Fail composition | `error: face_composition` → no rail, no ledger |
| `frLivePoller.js` / `frOfflineVideo.js` | Skip `face_composition` like clipped |

**Pad defaults:** top 0.40× · side 0.45× · bottom 1.15× face box  
Env: `FM_FR_BUST_PAD_TOP` / `_SIDE` / `_BOTTOM` / `FM_FR_BUST_MIN_H_MULT` / `_MIN_W_MULT`

Restart fleet (**sidecar** + Node). Fewer snaps OK — better than 8 ugly tiles.
