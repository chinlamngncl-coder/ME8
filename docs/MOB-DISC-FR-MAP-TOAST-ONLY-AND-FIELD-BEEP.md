# MOB DISC — Go to map toast-only · BWC field beep silence

**Status:** DISC only — **2026-07-11**  
**Trigger:** Operator — **Go to map** shows “Showing last known position” but map/pin feels unchanged; **no BWC beeps** since morning on FR hits  
**Search:** go to map, last known position, field beep, alert field, auto beep, PTT cue  
**Related:** `MOB-DISC-FR-MAP-BUTTON-GO-OPS-PIN.md`, `MOB-DISC-FR-FIELD-ALERT-ONE-BEEP.md`, `MOB-DISC-FR-NOT-MIXED-LIVE-SOS-PTT.md`, `MOB-DISC-FR-ALERT-UX-SOP-INDUSTRY-SOS-PARITY.md`

---

## Two separate issues

| # | Symptom | Likely cause |
|---|---------|----------------|
| **A** | Toast only — “Showing last known position”, no obvious zoom/popup | Fleet fallback fired; hit GPS missing and/or focus path weak when already on Ops |
| **B** | No beeps on catching BWC | **Field alert is manual** — not sent on every match; toast has no **Alert field** button |

---

## A — Go to map: toast but “nothing” on map

### What your screenshot shows

- Already on **Operations** with FR red toast open.
- Bottom toast: **“Showing last known position”** → `mob-fr-map-focus-pin` **did run** and used **fleet pin fallback** (not hit GPS on payload).
- Map cluster **“2”** (PP group) — catching unit may be inside cluster, not an opened pin popup.

### Why it feels like nothing

| Cause | Detail |
|-------|--------|
| **Hit GPS still missing** | `mob-fr-hit-gps-on-emit` is **server-side** — needs **`RESTART-FLEET.bat`** after apply. Without restart, hit has no `lat`/`lon` → fallback + “last known” toast every time. |
| **Already on Ops** | `goOpsOnHit({ explicit: true })` still calls `switchToOpsTab()` when `explicit` — unnecessary tab recycle; pan can race `invalidateSize`. |
| **Same map centre** | If fleet pin is where map already is, `setView` has **no visible move** — only toast changes. |
| **Clustered pins** | `upsertDeviceMarker(..., openPopup=true)` on one cam may not surface popup when two BWCs share GPS cluster — operator sees **“2”** badge, not Chin popup. |
| **camId key mismatch** | `deviceMarkers[camId]` lookup may miss if ID not normalized same as map layer (`normalizeCamId`). |

### Locked target (next MOB)

**`mob-fr-map-focus-pin-v2`** (or extend v1):

1. **Explicit + already on Ops** → skip `switchToOpsTab`; only `invalidateOpsMap` + focus.
2. **Normalize camId** for `deviceMarkers` lookup + `upsertDeviceMarker`.
3. **Colocated cluster** → expand cluster / `assignColocatedPinPopupDocks` / open catching pin popup (reuse SOS pin focus helpers).
4. **Stronger feedback** → brief pin pulse or select fleet row for `camId` when pan is a no-op.
5. **Verify gps-on-emit** — drawer GPS line should show coords after fleet restart (not “No GPS”).

### PASS after fix

1. Real hit, BWC on map → **Go to map** → visible zoom **or** pin popup open on **catching** BWC (not just toast).
2. Drawer GPS shows lat/lon when device reports GPS (post restart).
3. Two-pin cluster → still opens **correct** unit popup or cluster shift bar.

---

## B — BWC beeps: what the product actually does

### Locked — not automatic on match

| Event | BWC beep? | How |
|-------|-----------|-----|
| **Watchlist face match** | **No** (by design today) | Dispatch PC **chime** only (`playChime` in `fr-alarm.js`) |
| **Alert field** (operator click) | **Yes** — ~10 dual-beeps over ~8–9 s | `fr-field-alert` → `lib/frFieldAlert.js` → PTT audio path |
| **Standby PTT team** | **No beep** — opens radio group | Different from field alert |
| **SOS** | Device SOS path | **Not** FR |

**Auto field alert on every hit** was discussed and left **off** (`MOB-DISC-FR-ALARM-FIELD-ALERT-PLAN.md` — manual only at ship).

### Where **Alert field** lives today

| Surface | Has **Alert field**? |
|---------|----------------------|
| Legacy modal (`#fr-alarm-field`) | Yes |
| Alert drawer (footer actions) | Yes |
| Red toast | **No** — only Go to map, Show live, Open detail, Ack, Dismiss |
| HQ bar | **No** |

If operators only use the **toast** (new Act 1b UI), they may **never** send the BWC beep unless they open **Open detail** → drawer → **Alert field**.

### Why silence since morning — checklist

| Check | If fail |
|-------|---------|
| Operator clicked **Alert field**? | No click → **no beep** (expected) |
| `RESTART-FLEET.bat` after field-alert MOBs? | Old pacing / broken path |
| Catching BWC **PTT online**? | `ptt_offline` — beep skipped; MESSAGE may still send |
| **25 s cooldown** per cam (`FM_FR_FIELD_ALERT_COOLDOWN_MS`) | Second click within cooldown → no burst |
| BWC in **live call** / Talk? | PTT cue skipped (`ptt_skipped_call_active`) |
| `FM_PTT_ENABLED` / PTT server up? | No downlink audio |
| Drawer status after click | “Field alert sent” vs “failed — BWC not on PTT” |

### Server audit

Look for `analytics.fr_field_alert` rows today — if **none**, operator never triggered field alert (only matches).

---

## MOB plan

| # | MOB | Delivers | Risk |
|---|-----|----------|------|
| **1** | **`mob-fr-map-focus-pin-v2`** | Ops-already fix, camId normalize, cluster popup, fleet row select | Medium — `fr-alarm.js` |
| **2** | **`mob-fr-toast-alert-field`** | **Alert field** on red toast (one tap beep) | Low — UI only |
| **3** | **`mob-fr-auto-field-alert-opt-in`** | Site flag `FM_FR_AUTO_FIELD_ALERT=1` → beep catching BWC on **blacklist** hit only | Medium — policy |
| **4** | **`mob-fr-field-alert-smooth-cue`** | Fix choppy burst (existing DISC) | Low–med — `frFieldAlert.js` |
| **5** | **`mob-fr-hit-gps-restart-verify`** | Doc/ops only — confirm fleet restart after gps-on-emit | None |

**Order:** **1** first (your map pain). **2** if operators live on toast. **3** only if site wants auto-beep policy.

---

## Operator SOP (today, no new MOB)

```
FR hit → Open detail (or drawer already open)
       → Alert field   ← BWC beep (~10 dual-beeps)
       → Standby PTT team   ← radio (not beep)
       → Go to map   ← needs gps-on-emit restart + map-focus v2 for cluster
```

**Words:** **Alert field** = beep to catching BWC. **Standby PTT** = group radio. Do not call the beep “PTT” in UI.

---

## FAQ

| Question | Answer |
|----------|--------|
| Should every match beep the BWC? | **Not today** — manual **Alert field** or future opt-in MOB #3 |
| Why “last known position”? | Hit payload had no GPS; fleet pin used — restart fleet for gps-on-emit |
| SOS beeps but FR doesn’t? | SOS uses device alarm path; FR uses separate manual field alert |
| Chime on PC but not BWC? | PC chime always on hit; BWC needs **Alert field** |

---

## Apply commands (when ready)

```
MOB-APPLY mob-fr-map-focus-pin-v2
```

```
MOB-APPLY mob-fr-toast-alert-field
```

```
MOB-APPLY mob-fr-auto-field-alert-opt-in
```
