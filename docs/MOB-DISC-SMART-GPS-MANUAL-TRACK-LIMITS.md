# MOB DISC — Smart GPS manual track · HQ 📍 · how many officers

**Status:** DISC only — **2026-07-11**  
**Trigger:** Operator — is HQ 📍 track **manual**? How many officers can we click at once?  
**Search:** smart gps, manual track, fleet track button, concurrent limit, sos-team  
**Related:** `MOB-DISC-BWC-ROUTE-TRACE-FR-SOS-UNIFIED.md`, `MOB-DISC-ME8-FLEET-SCALE-SOP.md`

---

## Short answers

| Question | Answer |
|----------|--------|
| Is 📍 **manual**? | **Yes** — operator toggles per online BWC in **Settings → Fleet**. Not automatic for the whole fleet. |
| How many can you click? | **Today: no hard cap in code** — each online unit can be toggled on independently. |
| Practical lab limit? | **8 BWCs** registered — you *could* track all 8 if all online (not recommended for SIP load). |
| Recommended ship cap? | **Locked proposal: 8 manual** (align live/pin cap) — needs MOB to enforce. |
| Auto vs manual? | **SOS / (future FR)** add **automatic** high-res on incident units — **separate reasons**, same store. |

---

## What 📍 does (manual track)

**Where:** Settings → **Fleet** table → **GPS** column → **📍** (online units only).

**Action:** Toggle high-resolution GPS for **that one BWC**:

```
POST /api/smart-gps/track
{ "deviceId": "<camId>", "active": true|false }
→ smartGpsTrack.start(camId, 'manual')
```

| Effect | Detail |
|--------|--------|
| SIP | Sends MobilePosition **Interval** query — default **15s** (`FM_GPS_HIGH_RES_INTERVAL_SEC`) |
| Store | Denser breadcrumbs in `gps-track` DB (`setHighResDevices`) |
| UI | Row status **📍 Track** (cyan); button `active`; all dashboards get `smart-gps-state` |
| Stop | Click 📍 again → `stop(camId, 'manual')` |
| Audit | `smart_gps.track_start` / `smart_gps.track_stop` |

**Not manual:** baseline patrol GPS (~120s, `FM_GPS_POLL_MS`) runs for online units without clicking 📍.

---

## Automatic high-res (not 📍)

| Trigger | Reason | Who |
|---------|--------|-----|
| SOS alarm | `sos-alarm` | Alarming BWC — auto on `sos-alarm` push |
| SOS PTT team | `sos-team` | Online helper BWCs from nearby team API |
| FR hit (planned) | `fr-hit` | Catching BWC — `mob-fr-hit-smart-gps` |
| FR standby team (planned) | `fr-team` | Mirror SOS team |

**Reason stacking:** One BWC can have **multiple reasons** (e.g. `manual` + `sos-alarm`). High-res stays until **all** reasons cleared. Stopping manual 📍 does **not** stop SOS auto-track on same unit.

---

## How many officers — code truth today

```javascript
// lib/smartGpsTrack.js — active = Map<camId, …>
// NO maximum size check on start()
```

| Limit type | Value | Notes |
|------------|-------|-------|
| **Smart GPS manual concurrent** | **Unlimited** (code today) · **ship: 50** (`MOB-DISC-SMART-GPS-MANUAL-CAP-50.md`) |
| **Track button shown** | **Online only** | Offline rows have no 📍 |
| **Scope** | Per session | `assertSessionCanAccessCam` — dispatch group scope |
| **Map pin checkboxes** | **Max 8** | `MAX_PIN_SELECT = 8` — **different feature** (live pin popup, not GPS interval) |
| **Live video pool** | **8** | Fleet scale SOP — related stress, not wired to smart GPS |

**So:** You can manually track **more than 8** today if the server allows — there is **no UI warning** and **no server reject**.

---

## Risk of unlimited manual track

| Risk | Why |
|------|-----|
| SIP load | Each tracked BWC gets Interval queries every 15s + 5 min refresh |
| Device battery / radio | More frequent GPS reports from BWC firmware |
| Server DB write rate | More `gpsTrack.recordPoint` rows |
| Operator confusion | No “who am I following?” summary beyond cyan rows |

**Industry pattern:** Manual follow is **few units**; incident auto-track adds **alarm + nearby team** only.

---

## Locked policy (proposal — ship)

### Manual cap

| Rule | Value |
|------|-------|
| Default max concurrent **manual** tracks | **50** (`FM_SMART_GPS_MANUAL_MAX`) — see **`MOB-DISC-SMART-GPS-MANUAL-CAP-50.md`** |
| UI warn threshold | **32** (`FM_SMART_GPS_MANUAL_WARN`) |
| Behaviour at cap | Toast + API 409; counter in Fleet toolbar |
| Super-admin override | `FM_SMART_GPS_MANUAL_MAX=0` unlimited (lab only) |

**Note:** **8** was live-video pin cap — **do not** use for GPS. Revised 2026-07-11.

### Automatic (incident)

| Rule | Value |
|------|-------|
| SOS alarming BWC | Always `sos-alarm` (does not consume manual quota) |
| SOS helpers | Batch `sos-team` — cap **nearby count** already bounded by SOS UI |
| FR hit (future) | `fr-hit` on 1 catching BWC; optional `fr-team` for standby PTT set |

**Total active high-res** = manual + incident reasons per device. Suggested **soft warn** at 12 distinct camIds active (any reason).

### vs map pins (do not merge caps)

| Feature | Cap | Purpose |
|---------|-----|---------|
| Map pin checkbox | 8 | Live video popups on Ops map |
| Manual smart GPS 📍 | **8 (proposed)** | Dense GPS trail |
| Incident auto GPS | On top | SOS/FR — not blocked by manual cap |

---

## Operator SOP (plain language)

1. **Normal shift** — map shows last position (~2 min patrol GPS). No 📍 needed.
2. **Follow one officer closely** — click 📍 on that row; click again to stop.
3. **Follow a few** — click 📍 on each (today unlimited; **ship: max 8**).
4. **SOS** — alarming unit auto high-res; nearby team may auto-add — **not** the same as your manual picks.
5. **After incident** — Evidence → **Route & GPS** for replay (all breadcrumbs, manual or not).

---

## MOB plan

| # | MOB | Delivers |
|---|-----|----------|
| **1** | **`mob-smart-gps-manual-cap`** | `FM_SMART_GPS_MANUAL_MAX` default 8; reject + fleet toast; counter in UI |
| **2** | **`mob-smart-gps-active-summary`** | Settings strip: “High-res GPS: 3 manual · 1 SOS · 2 team” |
| **3** | **`mob-fr-hit-smart-gps`** | Auto `fr-hit` (does not use manual quota) |
| **4** | **`mob-smart-gps-i18n-fleet`** | Add `fleet.gpsTrack*` to `en.json` (today fallbacks in `fleet-ui.js` only) |

**Not in scope:** Changing 15s interval (env already exists).

---

## PASS checkpoint — `mob-smart-gps-manual-cap`

1. Track 50 online BWCs via 📍 (or lab max) — all active.
2. 51st click → blocked with clear message; server 409.
3. Stop one manual → 51st succeeds.
4. SOS on another BWC → `sos-alarm` still starts even at manual cap.
5. Audit rows for start/stop unchanged.

---

## Apply command

```
MOB-APPLY mob-smart-gps-manual-cap
```

---

## FAQ

| Question | Answer |
|----------|--------|
| Is 📍 only for HQ? | **Settings → Fleet** (any user with fleet access in scope). |
| Track offline officer? | **No** — button hidden when device offline. |
| Same as Route & GPS panel? | **Related** — 📍 makes **denser points**; Route panel **replays** stored route. |
| Can I track all 32 watch roster? | Roster ≠ fleet register; only **registered online BWCs** in Fleet table. |
| Competition? | Manual follow few units; incident raises rate for alarm + team — we match with cap MOB. |
