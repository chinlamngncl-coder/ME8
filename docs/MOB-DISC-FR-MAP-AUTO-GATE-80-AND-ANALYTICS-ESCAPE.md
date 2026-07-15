# MOB DISC — FR map auto gate @ 80% · Analytics never stuck

**Status:** DISC 2026-07-11 — operator correction to prior 88% draft · **no APPLY**  
**Trigger:** “By **80%** you need to react already” — not 92%. On **Analytics**, every alert button must be able to reach **Operations / map**; operators must not feel trapped on the FR page.  
**Search:** auto gate, 80 percent, FM_FR_MAP_AUTO_SCORE_MIN, Analytics stuck, Go to map, HQ Open, escape routes  
**Related:** `MOB-DISC-FR-MAP-FOCUS-GATE-AND-LIVE-PRIORITY.md`, `MOB-DISC-FR-GRADE-TIERED-ALERT-URGENCY.md`, `MOB-DISC-FR-ALERT-GO-OPS-MAP.md`

---

## Plain answer

| Prior DISC draft | **Locked correction (you)** |
|------------------|----------------------------|
| Auto map @ **88%** | Auto dispatch @ **≥ 80%** |
| 78% blacklist → toast only until click | **75–79%** → toast + manual **Go to map**; **80%+** → auto react |
| Analytics “Open” = drawer only | **Every dispatch control** must offer a path to **Ops / map** |

**Auto gate** (`mob-fr-map-auto-gate`) = **score floor for automatic** tab switch + map pan. It does **not** block alerts, buttons, or manual dispatch.

---

## Part A — Three score lines (not one knob)

| Line | Env | Default | Meaning |
|------|-----|---------|---------|
| **Match** | `FM_FR_MATCH_MIN` | **75** | Sidecar match → hit can exist (if grade allows interrupt) |
| **React** | `FM_FR_MAP_AUTO_SCORE_MIN` | **80** | **Auto** go-ops + map pan when interrupt fires |
| **High** | (optional later) `FM_FR_MAP_HIGH_SCORE_MIN` | **90** | Stronger UI emphasis only — not required for v1 |

### Examples (blacklist grade, on Analytics)

| Score | Operator sees | Auto Ops + map |
|-------|---------------|----------------|
| 74% | No interrupt hit (below match) | — |
| 76% | Red toast + HQ bar | **No** — click **Go to map** |
| **82%** | Red toast + HQ bar | **Yes** — lands on Ops, fuchsia pin |
| 95% | Same | **Yes** |

### Grade still applies (server + client already partly done)

| Grade | Interrupt (`fr-blacklist-hit`) | Auto @ ≥80% |
|-------|-------------------------------|-------------|
| `poi` / `monitoring` | **No** (rail + ledger) | **No** |
| `suspect` | **Yes** (amber MOB later) | **Yes** @ ≥80% — or site flag off suspect auto |
| `blacklist` | **Yes** | **Yes** @ ≥80% |

**Suspect site flag (optional):** `FM_FR_AUTO_GO_OPS_SUSPECT=0` → suspect never auto; blacklist still auto @ ≥80%.

---

## Part B — What “auto gate” is / is not

| Auto gate IS | Auto gate IS NOT |
|--------------|------------------|
| Server/client check: `scorePct >= FM_FR_MAP_AUTO_SCORE_MIN` before **auto** `goOpsOnHit()` | Blocking the hit or hiding the toast |
| Applies only when operator did **not** click a button | Disabling **Go to map** |
| Works with `mob-fr-go-ops-by-tier` (grade + score) | Replacing tier server |
| Default **80** for operational reaction | Waiting until 88–92% |

**Explicit always wins:** any **Go to map** / **Map** click runs `goOpsOnHit({ explicit: true })` — **any score**, fleet last-known GPS OK.

---

## Part C — Analytics escape audit (code today)

Operator on **Analytics** (`app-view-analytics` visible). FR hit active.

### Button matrix

| Control | Location | Today | Reaches Ops / map? | Gap |
|---------|----------|-------|-------------------|-----|
| **Go to map** | Red toast | `goOpsOnHit(explicit)` | **Yes** | OK |
| **Map** | Alert drawer | `showHitOnMapFromCurrent` | **Yes** (if GPS or fleet pin) | Disabled when no location |
| **Show on map** | Snap rail lightbox | `showFrSnapOnMap` → Ops tab | **Yes** (if GPS on snap) | OK for snaps |
| **Open** | HQ bar | `openModalOnly()` → drawer | **No** — stays Analytics | **GAP** |
| **Open detail** | Red toast | `openAlertDrawerShell` | **No** — drawer on Analytics | **GAP** unless user finds **Map** in drawer |
| **Show live** | Red toast | `disabled` (Act 3) | **No** | Known placeholder |
| **Standby PTT** | Toast / HQ / drawer | PTT API only | **No** tab switch | Acceptable if map buttons exist |
| **Ack / Dismiss** | All surfaces | Clears UI | **No** (intentional) | OK |
| **Top nav Operations** | Header | Manual tab | **Yes** | Always available — but alert UX must not rely on this alone |

### Why operators feel “stuck”

1. **HQ Open** is the obvious muscle-memory button after minimizing toast — it opens **detail on Analytics**, not Ops.  
2. **Open detail** same — no map unless operator scrolls to **Map** in drawer footer.  
3. **Auto go-ops** @ 75–79% does not fire (after auto gate) — correct — but if **Go to map** is missed, only HQ **Open** is visible → feels broken.  
4. **Drawer Map** disabled when `!hitHasMapTarget` — rare if fleet pin exists; still a trap when GPS + pin both missing.

### Locked rule — Analytics escape

> **Every FR dispatch surface** (HQ bar, red toast, alert drawer) must expose **at least one** control labelled **Go to map** or **Operations** that switches to Ops and runs map focus (v2), without Ack first.

**Ack is not a gate** to leave Analytics (unchanged from SOS-family DISC).

---

## Part D — Target UX (locked)

### HQ bar (all pages)

```
[ FR hit ]  Name · BWC · 82%     [ Go to map ] [ Open detail ] [ Standby PTT ] [ Ack ] [ Dismiss ]
```

- **Go to map** — primary escape (new on HQ bar).  
- **Open** renamed **Open detail** — drawer only; never the only map path.

### Red toast

```
[ Go to map ] [ Open detail ] [ Ack ] [ Dismiss ]     (Show live — later Act 3)
```

- **Go to map** always enabled when `hit.camId` present (fleet fallback).  
- Never disable **Go to map** for low score — only auto is gated.

### Alert drawer

- **Map** → label **Go to map** (consistent copy).  
- Enabled when `camId` + (hit GPS **or** fleet pin).  
- Optional: **Go to Operations** secondary link if map focus fails (toast “No location”).

### Auto behaviour summary

| Condition | On Analytics |
|-----------|--------------|
| Blacklist **≥ 80%** | Auto Ops + map (if location) |
| Blacklist **75–79%** | Toast + HQ; operator clicks **Go to map** |
| Suspect **≥ 80%** | Same unless `FM_FR_AUTO_GO_OPS_SUSPECT=0` |
| Any interrupt + **Go to map** click | Always Ops + focus |

---

## Part E — MOB plan (apply in order)

| # | MOB | Delivers |
|---|-----|----------|
| **1** | **`mob-fr-map-auto-gate`** | `FM_FR_MAP_AUTO_SCORE_MIN=80`; `shouldAutoMapForHit(hit)` in `fr-alarm.js`; auto `goOpsOnHit` only when grade tier + score ≥ 80 |
| **2** | **`mob-fr-hq-go-map`** | HQ bar **Go to map** button; rename Open → **Open detail** (`en.json`) |
| **3** | **`mob-fr-toast-map-always`** | Toast **Go to map** enabled whenever `hit.camId`; never score-gated |
| **4** | **`mob-fr-drawer-map-fallback`** | Drawer map uses same `resolveHitMapLocation` + copy **Go to map** |
| **5** | Later | `mob-fr-amber-toast-suspect`, `mob-fr-standby-ptt-map-strip` |

**Do not bundle** 1–4. Genre: dispatch-trace / alert-ui.

### Code touch (expected)

| MOB | Files |
|-----|-------|
| map-auto-gate | `fr-alarm.js`, `.env.me8.example` |
| hq-go-map | `index.html` HQ bar HTML, `fr-alarm.js`, `en.json` |
| toast-map-always | `fr-alarm.js` `fillRedToast` / bind |
| drawer-map-fallback | `fr-alarm.js` drawer enable logic |

**No** changes to `video-wall.js`, `ptt-rx.js`, `sipServer.js`, SOS pipeline.

---

## Part F — Env flags (ship)

```env
FM_FR_MATCH_MIN=75
FM_FR_MAP_AUTO_SCORE_MIN=80
FM_FR_AUTO_GO_OPS=1
FM_FR_AUTO_MAP=1
# FM_FR_AUTO_GO_OPS_SUSPECT=0   # optional: suspect manual only
# FM_FR_ALERT_TIER=1            # poi/monitoring silent (default on)
```

---

## Part G — PASS checkpoint (when MOBs land)

| # | Test (start on **Analytics**, FR watch running) |
|---|--------------------------------------------------|
| 1 | Blacklist **78%** → toast + HQ; **no** auto tab; **Go to map** → Ops + fuchsia pin |
| 2 | Blacklist **82%** → **auto** Ops + map |
| 3 | HQ **Go to map** from any page → Ops + focus |
| 4 | HQ **Open detail** → drawer on Analytics; **Go to map** in drawer still works |
| 5 | Toast **Open detail** → not the only way to reach map |
| 6 | Suspect **81%** → per site flag (auto or manual) |
| 7 | `poi` match → rail only; no toast trap |

---

## FAQ

**Q: Why 80% not 75%?**  
A: 75% is **match exists**. 80% is **dispatch reaction** — operator still sees 76–79% alerts but room is not hijacked until score warrants auto move.

**Q: Can we lower auto to 75%?**  
A: Site env only — not recommended; brings back “cheater” auto-jump noise.

**Q: Does Go to map steal live video from other operators?**  
A: **No** — map focus only (v2 PASS). Live promote is separate MOB.

---

## Bottom line

| Topic | Locked |
|-------|--------|
| Auto reaction score | **≥ 80%** |
| 75–79% | Alert yes · auto map **no** · buttons yes |
| Analytics stuck | Fix HQ **Open** trap + **Go to map** on every surface |
| Next APPLY | **`mob-fr-map-auto-gate`** then **`mob-fr-hq-go-map`** |

Your 80% line is the operational standard; 88% draft is **withdrawn**.
