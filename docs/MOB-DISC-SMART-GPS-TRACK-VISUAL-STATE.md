# MOB DISC — Smart GPS 📍 visual state · “am I tracking?”

**Status:** DISC only — **2026-07-11**  
**Trigger:** Operator — if I click 📍 again will I miss it? Need one-glance know if GPS high-res track is on; confused with “recording”  
**Search:** gps track visual, fleet row colour, active state, recording vs GPS  
**Related:** `MOB-DISC-SMART-GPS-MANUAL-TRACK-LIMITS.md`, `MOB-DISC-BWC-ROUTE-TRACE-FR-SOS-UNIFIED.md`

---

## Short answer

| Question | Answer |
|----------|--------|
| Will I miss that track is on? | **Partially** — Fleet row **does** change colour today, but only if you are on **Settings → Fleet**. Easy to miss from Ops map or Analytics. |
| Does 📍 change colour? | **Yes** — button cyan + whole row tint + status text **📍 Track**. |
| Is this “recording”? | **No** — this is **GPS trail density**, not body-worn **video recording**. Different words in UI (locked). |

---

## What exists today (code)

When `smart-gps-state` lists a `camId` as active (`manual`, `sos-alarm`, etc.):

| Signal | Where |
|--------|--------|
| **📍 button** | `.fleet-row-track-btn.active` — cyan border + light blue fill |
| **Whole row** | `.fleet-row-gps-track` — row background `rgba(14, 165, 233, 0.08)` |
| **Status column** | `fleet.statusGpsTrack` → **📍 Track** (cyan bold) instead of “Online” |
| **Toggle off** | Click 📍 again → styles revert to normal online row |

Server state **survives** if another tab is open; on **full page refresh** server re-sends `smart-gps-state` on socket connect → Fleet should repaint **if** you open Fleet tab.

**Gap:** No global banner, no Ops map badge, no “3 units tracked” summary.

---

## GPS track ≠ video recording (locked words)

| Term | Meaning |
|------|---------|
| **GPS track** / **High-res GPS** | Denser location breadcrumbs (~15s) — 📍 button |
| **Live video** | Stream to C2 map pin / wall — separate start/stop |
| **Recording** | BWC firmware event recording — telemetry `recording: '1'` on fleet row |

**UI must not say “recording” for 📍.** Use **“GPS track ON”** or **“High-res GPS”**.

---

## Why operators still miss it

| Gap | Effect |
|-----|--------|
| Feedback only on **Fleet** table | On Ops / Analytics you do not see row cyan |
| No **header counter** | “Manual GPS: 2/8” missing |
| No **map ring** on tracked pin | Pin looks same as patrol GPS |
| SOS auto-track same colour as manual | Cannot see *why* track is on without opening Fleet |
| Brief toast only on API error | Success is silent |

---

## Locked visual SOP (target)

### Fleet (keep + enhance)

| Element | Behaviour |
|---------|-----------|
| 📍 button | **ON:** cyan + `aria-pressed="true"` + tooltip “GPS track ON — click to stop” |
| Row | Cyan tint (existing) |
| Status | **GPS track ON** (not “Track” alone) |
| **New:** Fleet toolbar | `High-res GPS: 2 manual · 1 SOS` — always visible on Fleet panel |

### Ops map (new)

| Element | Behaviour |
|---------|-----------|
| Tracked unit pin | **Cyan ring** or pulsing halo (distinct from SOS red) |
| Pin popup line | `High-res GPS ON (manual)` or `(SOS)` |
| Legend | One line: cyan ring = dense GPS follow |

### Optional toast (toggle only)

| Action | Toast |
|--------|-------|
| Turn ON | `GPS track ON — {unit name}` (2s, non-blocking) |
| Turn OFF | `GPS track OFF — {unit name}` |

---

## MOB plan

| # | MOB | Delivers |
|---|-----|----------|
| **1** | **`mob-smart-gps-fleet-visual-v2`** | Rename strings; toolbar counter; ON/OFF micro-toast; tooltip |
| **2** | **`mob-smart-gps-map-ring`** | Cyan ring on map pin when `smartGpsTrack.isActive(camId)` |
| **3** | **`mob-smart-gps-reason-badge`** | Fleet row shows `(manual)` / `(SOS)` / `(FR)` chip |

One MOB at a time.

---

## PASS checkpoint — `mob-smart-gps-fleet-visual-v2`

1. Click 📍 ON → row cyan + status **GPS track ON** + counter `1/8`.
2. Click 📍 OFF → normal online row + counter `0/8`.
3. SOS alarm → row shows **GPS track ON (SOS)** without manual click.
4. From Ops map (without Fleet tab) → after MOB #2, pin shows cyan ring.

---

## Apply

```
MOB-APPLY mob-smart-gps-fleet-visual-v2
```
