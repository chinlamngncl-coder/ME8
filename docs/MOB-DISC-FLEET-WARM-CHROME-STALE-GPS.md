# MOB DISC — Warm chrome GPS cache vs walking BWC (stale pin risk)

**Status:** **APPLIED** `mob-fleet-warm-chrome-no-stale-pin` 2026-07-10 — cache→map on boot **removed**  
**Search:** warm chrome, stale GPS, walking, offline grey pin, last-gps cache  
**Related:** `MOB-DISC-FLEET-BOOT-BWC-COMEUP-SLOW.md`

---

## Operator judgment (locked)

Boot-painting `last-gps.json` on the map is **wrong** for walking BWCs. Grey offline pins (session drop) stay. Fresh GPS when online.

---

## Shipped

| Change | Detail |
|--------|--------|
| `server.js` | Removed warm chrome emit / `offlineOrWarmPinCoords` / boot cache pins |
| `/api/last-gps` + map-positions | Offline coords **only** via `offlineMapPinSession` (grey offline policy) |
| Client | Removed `fleet-warm-chrome.js` script |

**Kept:** Grey offline pin when this process saw them go offline + TTL.  
**Next for come-up speed:** `mob-fleet-first-contact-burst` / `mob-fleet-gps-boot-cooldown-fix` — fresh GPS, not stale pins.
