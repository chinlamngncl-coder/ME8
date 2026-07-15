# MOB DISC — HQ bar Go to map · Analytics escape (MOB 2 of 4)

**Status:** DISC + APPLY 2026-07-11 — test tomorrow  
**Trigger:** After `mob-fr-map-auto-gate`, operators on **Analytics** still trap on HQ **Open** (drawer only). Need **Go to map** on HQ bar; rename **Open** → **Open detail**.  
**Search:** HQ bar, fr-hq-alert-map, Analytics stuck, Open detail, escape routes  
**Related:** `MOB-DISC-FR-MAP-AUTO-GATE-80-AND-ANALYTICS-ESCAPE.md`, `mob-fr-map-auto-gate` PASS pending

---

## Plain answer

| Before | After |
|--------|-------|
| HQ **Open** → drawer on Analytics | HQ **Go to map** → Ops + fuchsia pin (v2) |
| Only toast had map escape | HQ bar = same escape when toast minimized |
| **Open** ambiguous | **Open detail** = drawer only |

**This MOB does not change** auto gate (80%), tier server, video, SOS, PTT, or pool.

---

## Part A — HQ bar layout (locked)

```
[ FR hit ]  Name · BWC · 82%  [+N]
    [ Go to map ] [ Open detail ] [ Standby PTT ] [ Ack ] [ Dismiss ]
```

| Button | Action |
|--------|--------|
| **Go to map** | `goOpsOnHit(current, { explicit: true })` — any score, fleet GPS fallback |
| **Open detail** | `openAlertDrawerShell(current)` — stays on current tab |
| **Standby PTT** | unchanged |
| **Ack / Dismiss** | unchanged |

**Go to map** is first action button (primary dispatch escape).

---

## Part B — Enable / disable rules

| State | Go to map |
|-------|-----------|
| Active hit with `camId` | **Enabled** |
| Lab preview hit | **Disabled** |
| No `camId` | **Disabled** |
| Score 75–79% (auto gate off) | **Enabled** — explicit bypass |
| No hit GPS but fleet pin | **Enabled** — v2 last-known path |

**Open detail** — always enabled when hit active (including lab preview for layout).

---

## Part C — Companion MOBs (same genre, apply separately)

| # | MOB | Status | Delivers |
|---|-----|--------|----------|
| 1 | `mob-fr-map-auto-gate` | ✅ Applied | Auto @ ≥80% |
| **2** | **`mob-fr-hq-go-map`** | **This MOB** | HQ **Go to map** + rename Open |
| 3 | `mob-fr-toast-map-always` | Pending | Toast map never score-disabled |
| 4 | `mob-fr-drawer-map-fallback` | Pending | Drawer **Go to map** label + camId enable |

Test tomorrow can cover **#2** alone; **#3–4** polish same escape story.

---

## Part D — Files touched

| File | Change |
|------|--------|
| `public/index.html` | `#fr-hq-alert-map` button in `#fr-hq-alert-bar` |
| `public/js/fr-alarm.js` | Bind HQ map; `updateHqBar` enable/disable |
| `public/locales/en.json` | `hqBarGoMap`, `hqBarOpen` → “Open detail” |

**No** `video-wall.js`, `fleet-ui.js`, `ptt-rx.js`, `server.js` pool changes.

---

## Part E — PASS checkpoint (tomorrow)

| # | Test |
|---|------|
| 1 | FR hit on **Analytics** → minimize toast → HQ **Go to map** → **Ops** + fuchsia pin |
| 2 | HQ **Open detail** → drawer on Analytics (no tab switch) |
| 3 | Hit **78%** → auto gate does not move tab → HQ **Go to map** still works |
| 4 | HQ bar visible on **Settings** page → **Go to map** → Ops |
| 5 | SOS / PTT / wall / VC smoke — unchanged |

---

## APPLY

```text
MOB-APPLY mob-fr-hq-go-map
```

Hard refresh only (client MOB).
