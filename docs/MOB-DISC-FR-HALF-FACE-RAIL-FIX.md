# MOB DISC — Half-face looks bad on 8-face Snapshot rail

**Status:** **APPLIED** `mob-fr-reject-clipped-face` 2026-07-10  
**Search:** half face, clipped face, edge box, Snapshot rail, `face_clipped`  
**Related:** `MOB-DISC-FR-HALF-FACE-SNAP-LEDGER.md`, `MOB-DISC-FR-SNAP-LEDGER-RETENTION-FTP-ZONES.md`

---

## Problem

Rolling Snapshot ~8 faces often showed **half / cut-off** faces — looks bad, weak match.

---

## Shipped

| Piece | Change |
|-------|--------|
| `fr-sidecar/app.py` | Probe rejects when face box within edge margin → `error: face_clipped` |
| `frLivePoller.js` | Treat `face_clipped` like blur/tiny → **no rail, no ledger** |
| `frOfflineVideo.js` | Same skip for offline frames |

**Margin:** `max(FM_FR_CLIP_EDGE_PX=8, FM_FR_CLIP_EDGE_FRAC=0.02 × min side)`

**Default:** clipped faces are **not** kept as evidence (archive stays useful).

Restart fleet (sidecar + Node) to pick up.

---

## Still later

Extreme profile without edge touch — optional follow-on if soak still shows junk.
