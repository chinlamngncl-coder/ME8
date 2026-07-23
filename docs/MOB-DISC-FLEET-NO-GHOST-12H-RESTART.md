# MOB DISC — No ghost devices after restart / 12h (system-wide)

**Status:** **APPLIED** `mob-fleet-no-ghost-12h-restart` 2026-07-10 — **METHOD FAIL (operator)** same night: hurt live / Open All / ~1–2 min GPS after restart. See **`MOB-DISC-GHOST-KILL-HURT-LIVE.md`**.  
**Search:** `UB-6A5G`, `seedFleetOnlineFromPersistedState`, `bwc-devices.json`, FR watch, `/api/fleet`, 12h  
**Related (narrow, already applied):** `mob-map-offline-pin-ttl-12h`, `mob-map-hide-gps-pending-banner`  
**This disc supersedes** the “optional roster follow-up” in `MOB-DISC-NO-AWAITING-GPS-STALE-UI.md`.

---

**Operator FAIL on method (2026-07-10 evening)**

After this APPLY: live/Open All hurt (black + can’t off class); restart felt retarded (~1–2 min GPS). Later OK after wait.  
**Do not repeat this blunt boot-offline + bundled purge as the ghost fix.** Proper ways: `MOB-DISC-GHOST-KILL-HURT-LIVE.md`.

**Softened 2026-07-10:** `mob-fleet-boot-online-soften` — boot only clears junk ids; real Chin/kk are not mass-`markOffline` / siteDb-wiped on every start. Junk purge + `isBwcCameraId` / PTT reject `UB-*` **kept**.

---

## What you locked (product rule)

| Event | Operator UI must |
|-------|------------------|
| **Fleet / server restart** | No device appears live / selectable / hanging until it **really** connects again |
| **Offline or last presence > 12h** | Device must **not** hang in active surfaces (FR watch, map chrome, live roster chips, etc.) |
| Scope | **Whole system** — not one banner, not one pin, not one cam name |

---

## Applied (`mob-fleet-no-ghost-12h-restart`)

| Change | Where |
|--------|--------|
| Boot: **real** `markOffline` on all fleet rows; never seed online from siteDb / contact URI | `server.js` `seedFleetOnlineFromPersistedState` |
| Purge junk `UB-6A5G` from registry; auto-purge non-GB ids on bootstrap | `storage/bwc-devices.json` + `purgeJunkBwcRegistryRows` |
| `isBwcCameraId` requires GB-style id (18+ digits / digit-heavy); rejects `UB-*` | `server.js` |
| Block auto-add / wall merge / POST save / PTT resolve / touch-online for junk ids | `server.js` |
| Offline map pin 12h TTL | unchanged (prior MOB) |

**Files edited:** `server.js`, `storage/bwc-devices.json`, this doc.  
**Not touched:** `ptt-rx.js`, `video-wall.js`, `fleet-ui.js`, `pttServer.js`.

**Operator:** `RESTART-FLEET.bat` then hard refresh — FR watch / roster must not show UB-6 until a real cam registers.

---

## Why it was hanging (pre-fix)

1. Junk row `deviceId: "UB-6A5G"` in `bwc-devices.json`  
2. Boot “clear” mutated `getDashboardFleet()` **copies** — registry stayed fake-online  
3. PTT login user could be treated as camId → ghost re-entry  

---

## Bottom line

Restart → all offline until real presence. Junk model strings cannot re-enter the registry. Active UIs that key off `online` (FR watch, etc.) stay clean.
