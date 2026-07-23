# MOB DISC — Ops map resize after tab / SOS chrome

**Status:** **APPLIED** 2026-07-13 — `mob-ops-map-resize-after-tab`  
**Trigger:** After Analytics (esp. with SOS banner) → Operations, map canvas stayed shrunk until window resize  
**Search:** invalidateSize, ops map shrink, refreshLayout, Analytics to Operations  

---

## Cause

Leaflet measures `#map` while Ops is `hidden` or before SOS strip height settles. One `requestAnimationFrame` + `FleetUi.refreshLayout` was not enough.

## Change

| File | Change |
|------|--------|
| `public/js/evidence-manager.js` | `scheduleOpsMapResize` (multi-pass invalidate); call on Ops tab; `ResizeObserver` on `#map-wrapper` + `#sos-banner` while Ops visible |
| `public/index.html` | cache-bust `evidence-manager.js` only |

**Not changed:** `fleet-ui.js` (locked), PTT, live wall, SOS ACK logic, inline boot.

## PASS check

1. SOS on Analytics (no ACK) → **Operations** — map fills the pane  
2. ACK while on Ops — map still fills (banner hide)  
3. Analytics ↔ Ops a few times — no permanent shrink
