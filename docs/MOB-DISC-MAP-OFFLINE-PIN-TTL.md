# MOB — Offline map pin: drop on restart + 12h TTL (APPLIED)

**MOB:** `mob-map-offline-pin-ttl-12h` — applied on user request (checkpoint FAIL; remove UB-6; offline off on restart / 12h)  
**Files:** `server.js`, `public/index.html` (map sync only), `storage/last-gps.json` (UB-6 removed)

---

## Policy

| Trigger | Effect |
|---------|--------|
| **Server restart** | `offlineMapPinSession` empty → no offline last-location pins until a device goes offline **this** run |
| **12 hours** | GPS older than TTL (or missing `at`) → no offline map pin (`FM_OFFLINE_MAP_PIN_TTL_MS`, default 12h) |
| **UB-6A5G now** | Removed from `storage/last-gps.json` |

Online cams still use last GPS for map when they have coords.

---

## Also fixed

Client used to **re-draw** offline pins even when server omitted them. Now: offline + not in `/api/map-positions` → **remove** marker.

---

## Soak

Restart fleet → hard refresh Ops → grey **UB-6** gone. Chin/kk Open All again.  
Reply **CHECKPOINT PASS** or **CHECKPOINT FAIL**.
