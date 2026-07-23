# MOB APPLIED — MAP-PIN-COLOCATED-OUTWARD-DOCK-V1

**Date:** 2026-07-22  
**Disc:** `docs/MOB-DISC-MAP-PIN-CHIN-COVERS-KK-20260722.md`

## Problem

Two colocated map pins (Chin + kk): click **Chin** → popup covered **kk** dot. Click **kk** → Chin still visible. Dock side was from slot/GPS sort, not **where dots sit on screen** after spread.

## Applied

| Change | Detail |
|--------|--------|
| `sortClusterForDock` (n=2) | Sort by **screen X** of marker after spread; left dot → left dock, right → right dock |
| `markerLayerPointForCam` | Helper for screen position |
| `bringPinPopupToFront` | Sibling colocated marker **z-index 1450** so partner dot stays clickable |

## Files

- `public/index.html` (inline map boot — live)
- `public/js/dashboard-boot.js` (mirror)

## Cache

- Hard refresh dashboard (`Ctrl+F5`) — map logic is inline in `index.html`

## Operator verify

1. **Ctrl+F5** on map dashboard
2. Chin + kk colocated → click **Chin** → **kk pin visible**, click kk works
3. Click **kk** → **Chin pin visible**
4. **Open All** → both popups outward, neither covers partner dot
