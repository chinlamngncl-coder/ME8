# MOB DISC — No “Awaiting GPS” nag + stale/offline must not appear in UI

**Status:** DISC locked + **Applied** `mob-map-hide-gps-pending-banner` 2026-07-10  
**Search:** `Awaiting GPS`, `map-gps-pending`, `pendingGps`, `12h`, `offline UI`, `UB-6A5G`  
**Related applied:** `mob-map-offline-pin-ttl-12h` (grey offline **pins** only)

---

## What you want (locked)

1. **Remove** the brown map banner: `Awaiting GPS: … — enable GPS on BWC` (`#map-gps-pending` / `map.gpsPending`).  
2. **Product rule (fleet-wide):** a device that is **not online**, or whose last useful presence/GPS is **older than 12 hours**, must **not** appear in operator UI as if it were an active / pending unit.

---

## What we already did vs what is still there

| Surface | Status |
|---------|--------|
| Grey **offline map pin** after restart / 12h | **Done** (`mob-map-offline-pin-ttl-12h`) |
| **Awaiting GPS** banner | **Still live** — never removed; easy to confuse with the grey pin (same UB-6 name) |
| Roster / other lists showing stale cams | **Superseded** — see `MOB-DISC-FLEET-NO-GHOST-12H-RESTART.md` (system-wide; not optional) |

---

## Locked rule (write this into ship SOP)

**Stale / offline visibility rule**

| Condition | UI must |
|-----------|---------|
| Device **offline** (no live SIP/presence) | No “awaiting GPS”, no fake live chrome, no offline pin beyond existing TTL policy |
| Last GPS / presence **> 12h** (same TTL family as offline pins) | Must not surface as pending / active on map chrome |
| Device **online** but no GPS yet | **Do not nag** with the brown banner (operator already knows; banner is noise) |

**Intent:** Map and headers stay clean. Ghost / lab / dead units (e.g. UB-6) must not keep nagging.

---

## Suggested APPLY (one MOB, when you say so)

**Name:** `mob-map-hide-gps-pending-banner`

| Change | Scope |
|--------|--------|
| Stop showing `#map-gps-pending` (hide always or delete emit path) | `index.html` / `dashboard-boot.js` and/or stop filling `pendingGps` for UI |
| Do **not** touch PTT / live wall / SIP | — |
| Align any leftover `pendingGps` consumers with the 12h + online rule | Server fleet-roster if needed |

Optional follow-up (separate MOB if needed): sweep roster chips / other “pending” lists for the same rule — **only if** soak still shows stale names after the banner is gone.

---

## Bottom line

You are right: that banner **should not be there**, and we **did not** take it out before (only offline pins).  
**Rule locked:** offline or **>12h** → not in active UI; **Awaiting GPS** banner → remove on APPLY.

Reply: `MOB-APPLY mob-map-hide-gps-pending-banner` when ready.
