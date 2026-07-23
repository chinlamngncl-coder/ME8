# MOB DISC — Smart GPS manual cap · 50 not 8 · SIP/radio risk

**Status:** DISC only — **2026-07-11** (revises `MOB-DISC-SMART-GPS-MANUAL-TRACK-LIMITS.md` cap proposal)  
**Trigger:** Operator — 8 manual 📍 is too low; market fleets track many more; is SIP/radio risk high? Try **50 max**  
**Search:** smart gps cap, 50, SIP load, MobilePosition, fleet scale, manual track limit  
**Related:** `MOB-DISC-SMART-GPS-MANUAL-TRACK-LIMITS.md`, `MOB-DISC-BWC-ROUTE-TRACE-FR-SOS-UNIFIED.md`, `MOB-DISC-ME8-FLEET-SCALE-SOP.md`

---

## Verdict

| Question | Answer |
|----------|--------|
| Can we go above 8? | **Yes** — **8 was tied to live-video pin cap by mistake.** GPS high-res is a **different resource**. |
| SIP/radio risk **high**? | **No for C2 SIP server** at 50. **Low–medium on BWC device** (battery/LTE), not PTT audio path. |
| Locked ship default | **`FM_SMART_GPS_MANUAL_MAX=50`** (env override). Lab may use `8` if needed. |
| Unlimited? | **No default** — `0` = super-admin lab only. |

---

## Why 8 was wrong

| Cap | Really limits | Should couple to GPS? |
|-----|---------------|------------------------|
| **8** | Map pin popups + **live video** decode pool | **No** |
| **50** | SIP MobilePosition **Interval** subscriptions + DB breadcrumb writes | **Yes** |

Operators can watch **8 live** and still **densely track 50 GPS** — different jobs.

---

## Load model — 50 manual tracks @ 15s

Assumptions: `FM_GPS_HIGH_RES_INTERVAL_SEC=15`, `FM_GPS_HIGH_RES_REFRESH_MS=300000` (5 min re-query).

| Direction | Rate (50 units) | Risk |
|-----------|-----------------|------|
| **C2 → BWC** SIP `MESSAGE` (set Interval) | 50 on start + 50 / 5 min refresh | **Low** — small XML, no RTP |
| **BWC → C2** MobilePosition NOTIFY | up to **~200 / min** (~3.3/s) inbound | **Low** for Node — XML parse + `lastGpsByCam` |
| **DB** `gpsTrack.recordPoint` | Throttled: `minMoveM` 15m + ~12s store interval when moving | **Low–medium** — ~4/s peak if all moving; SQLite OK at 50 |
| **Map UI** | 50 cyan rows / optional rings | **Low** — DOM only on Fleet panel |
| **PTT voice** (RTP) | **Unchanged** — separate SIP/media path | **Not blocked** by GPS MESSAGE |
| **BWC firmware** | More frequent GPS fix + uplink | **Medium** on weak LTE / old firmware — site soak |

**Compare:** One live video ≈ **orders of magnitude** more bandwidth than one GPS XML point.

---

## SIP vs radio — honest split

| Layer | High-res GPS impact |
|-------|---------------------|
| **C2 SIP server** | Extra `MESSAGE` + position NOTIFY — **light** vs REGISTER/INVITE/live |
| **LTE data** | GPS XML **tiny** vs H.264 live |
| **PTT half-duplex radio path** | **No shared codec path** with MobilePosition in our stack |
| **BWC CPU / GNSS** | More fixes → **battery** — operator should stop 📍 when done |
| **Many simultaneous live videos** | Still capped at **8** — unchanged |

**Risk label:** SIP **low** · device battery **medium** · PTT audio **low** (not the same pipe).

---

## What market products do

| Pattern | Typical scale |
|---------|----------------|
| **Map last-known** (patrol rate) | **All registered units** (hundreds on enterprise VMS) |
| **High-rate follow** | **Incident subset** — alarm unit + team + supervisor picks |
| **Manual supervisor track** | Often **dozens** during events — not capped at live-video count |
| **Audit** | Who enabled dense GPS — we have `smart_gps.track_start` |

Ubitron **patrol** already stores breadcrumbs for online fleet (~120s). **Manual 📍** only raises rate for units dispatch **chooses** — 50 is aligned with event-scale ops, not whole national fleet at 15s.

---

## Locked policy (revised)

### Manual cap

| Setting | Default | Meaning |
|---------|---------|---------|
| `FM_SMART_GPS_MANUAL_MAX` | **50** | Max concurrent `manual` reason tracks |
| `FM_SMART_GPS_MANUAL_WARN` | **32** | UI amber “high load” — still allowed until 50 |
| `FM_SMART_GPS_MANUAL_MAX=0` | Off | Unlimited — **lab / super-admin only** |
| Lab profile | `8` optional | ME8 8-BWC bench — not customer default |

### Does not count toward manual 50

| Reason | Source |
|--------|--------|
| `sos-alarm` | Auto on SOS |
| `sos-team` | Nearby helpers |
| `fr-hit` | Catching BWC (planned) |
| `fr-team` | Standby PTT team (planned) |

**Total high-res devices** = manual + incident. Suggested **soft warn** at **64** distinct camIds (any reason) — env `FM_SMART_GPS_TOTAL_WARN`.

### Operator rules

1. **Manual 📍** = supervisor choice — turn **off** when done (battery).
2. **Incident auto** = system — clears on ack/incident end policy.
3. Cannot track **offline** units (no 📍 button).
4. Cannot track more than **online** units in scope.

---

## UI (with cap MOB)

| Element | Copy |
|---------|------|
| Fleet toolbar | `High-res GPS: 12 manual (max 50)` |
| At warn 32 | Amber: `Many units on GPS track — battery impact` |
| At cap 50 | Block 51st: `Max 50 manual GPS tracks` |
| Terminology | **GPS track ON** — never “recording” |

---

## MOB plan

| # | MOB | Delivers |
|---|-----|----------|
| **1** | **`mob-smart-gps-manual-cap`** | Enforce `FM_SMART_GPS_MANUAL_MAX` default **50**; warn at 32; counter UI |
| **2** | **`mob-smart-gps-fleet-visual-v2`** | ON/OFF clarity + map ring (separate DISC) |
| **3** | **`mob-smart-gps-soak-50`** | Lab soak: 50 online sim / staggered 📍 15 min — log SIP + DB (doc only until lab) |

**Revise** `MOB-DISC-SMART-GPS-MANUAL-TRACK-LIMITS.md` table: default **50**, not 8.

---

## PASS checkpoint — `mob-smart-gps-manual-cap` @ 50

1. Set `FM_SMART_GPS_MANUAL_MAX=50`.
2. Track 50 online BWCs via 📍 — all active; counter `50/50`.
3. 51st → blocked with message.
4. SOS on another unit → `sos-alarm` still starts (not blocked).
5. PTT + one live video during 50-track — **no regression** (mini checkpoint).
6. Stop all manual → SIP Interval cleared per device (`sendQuery(id, null)`).

---

## Soak / rollback

| If soak FAIL | Action |
|--------------|--------|
| SIP log storm / device NACK | Lower default to **32** or raise interval to **30s** |
| DB write pressure | Raise `minMoveM` for high-res only |
| BWC battery complaints | SOP: manual off after event; keep 50 cap |

Env rollback: `FM_SMART_GPS_MANUAL_MAX=32` without code change.

---

## Apply

```
MOB-APPLY mob-smart-gps-manual-cap
```

Use in MOB implementation:

```javascript
// default 50, not 8
const MANUAL_MAX = Math.max(0, parseInt(process.env.FM_SMART_GPS_MANUAL_MAX || '50', 10));
```

---

## FAQ

| Question | Answer |
|----------|--------|
| Why not unlimited? | Runaway operator click + device battery + support burden |
| 50 enough? | Matches **event-scale** manual follow; full fleet stays patrol ~120s |
| Same as 50 live video? | **No** — live still **8**; GPS manual **50** |
| FR/SOS extra units? | Incident reasons **extra** on top of manual budget |
