# MOB DISC — FR map pin: need floating tag · Close kills fleet view

**Status:** DISC · **`mob-fr-map-pin-floating-tag` APPLIED 2026-07-13** · restore-view still parked (see RISK)  
**Date:** 2026-07-13  
**Trigger:** Must click the red FR pin to know what it is (many pins soon = confusing). After **Close** on FR snapshot, online fleet pins seem gone — must press **Fit pins** again.  
**Search:** fr-snap-map-marker, floating tag, Fit pins, setView, clearFrSnapMapAnchor, pin video risk  
**Related:** `MOB-DISC-FR-MAP-KEEP-NOTHING-EXPAND-RED.md` · map-anchor / Expand APPLIED  

---

## APPLIED — `mob-fr-map-pin-floating-tag`

- FR map marker uses BWC-style wrap: **floating label + red dot**
- Label: `FR snap · {name}` (+ score `%` when present)
- Visible without clicking; click still opens the card
- Files: `public/index.html` (CSS + `openFrSnapMapAnchorCard` icon), `public/locales/en.json`

---

## RISK — `mob-fr-map-close-restore-view` vs pin live video

**Question:** Will restore map view on FR Close hurt video when I click a BWC pin?

### Short answer

| Situation | Hurt video? |
|-----------|-------------|
| Click BWC pin **after** FR Close + restore | **No** (if MOB is careful) — normal `popupopen` → `syncPinVideoFromWall` |
| BWC pin **already playing** while FR Close restores zoom | **Low–medium** — pan/zoom does **not** stop the stream by itself; it only repositions docks. Glitch risk if we also close popups or hammer animate |
| Restore accidentally **closes** device pin popups | **Yes — high** — `popupclose` → `VideoWall.cleanupMapPinPlayerOnPopupClose` |

FR red pin is a **separate** marker (`frSnapMapMarker`), not `deviceMarkers[camId]`. Closing FR today does **not** go through device-pin `popupclose` cleanup. Restore must keep that separation.

### What map move/zoom already does

```
moveend  → schedulePinPopupReposition()     (layout only)
zoomend  → schedulePinPopupDockRefresh()    (layout only)
popupclose on device pin → cleanupMapPinPlayerOnPopupClose  ← kills pin video
```

So **setView / fitBounds alone ≠ stop video**. **closePopup on a live pin = stop video.**

### Hard rules for any APPLY of restore-view

1. **Never** `closePopup()` / remove `deviceMarkers` inside `clearFrSnapMapAnchor`  
2. Restore = `map.setView(savedCenter, savedZoom)` only (prefer **B1 stash**, not blind Fit pins while live pins open)  
3. Prefer **`animate: false`** on restore to reduce dock thrash  
4. **Optional safe gate:** if any device pin popup is open with live video → skip auto-restore (or restore quietly) and toast “Map stayed zoomed — Fit pins when ready” so we don’t fight live pin UI  
5. After restore, optional `repairOpenPinPopupVideos()` only if open pins existed — do not restart streams from scratch  
6. Do **not** call `fitMapToFleetPins()` as the default Close path when live pin popups are open (Fit pins can jump far; more layout stress)

### Click-pin after Close (your case)

Flow stays:

```
FR Close → remove FR marker → (restore view) → operator clicks BWC pin
  → popupopen → syncPinVideoFromWall / playMapPinVideoIfPopupOpen
```

Restore does not disable pin click or wall handoff. Risk is almost only **concurrent** live pin popup + animated zoom, not “next click won’t play.”

### Verdict

| MOB | Video risk if done right |
|-----|--------------------------|
| `mob-fr-map-pin-floating-tag` | None (icon HTML only) |
| `mob-fr-map-close-restore-view` | **Acceptable** with rules above; **unsafe** if paired with closing device popups or forced Fit pins during live pin video |

**Recommend:** APPLY tag first; restore-view with B1 + animate:false + never touch device pin popups. Add live-pin skip gate if lab sees any hitch.

---

## Pain (operator truth)

| # | What you feel | What’s actually going on |
|---|----------------|---------------------------|
| 1 | “Which red thing is the FR snap?” — must click pin | FR marker is a **bare red dot** — **no name tag**. Fleet BWC pins already have a floating **label** above the dot (`bwc-pin-label`). FR pin does not. |
| 2 | After Close FR, online pins “disappear” | Close only **removes the FR marker**. It does **not** delete fleet markers. **Show on map** did `setView(…, zoom ≥ 16)` centered on the snap GPS — other cams are often **off-screen**. View stays zoomed after Close → feels empty until **Fit pins**. |

So: not “pins deleted” — **camera left in a tight FR zoom** with no restore.

---

## Current behavior (code)

```
Show on map / openFrSnapMapAnchorCard
  → switch Ops
  → map.setView([lat,lon], max(zoom, 16))   ← steals overview
  → upsertDeviceMarker(cam)                 ← one BWC pin refresh
  → add red FR marker + openPopup
  → icon = plain red circle (no label)

Close
  → clearFrSnapMapAnchor() = remove FR marker only
  → map view / zoom UNCHANGED
```

Fleet pins use label + colored dot. FR pin = anonymous red circle among many blues → hunt-and-click.

---

## Product direction (agree)

### A) Always-visible floating tag on the FR pin

Same habit as BWC pins — **tag visible without click**:

| Tag content (v1) | Example |
|------------------|---------|
| Short brand | **FR snap** |
| + device | `FR · Chin` / `FR · {cam}` |
| Optional score | `FR · Chin · 87%` |

Click still opens the full card (Expand / Keep / Close). Tag ≠ full popup — just “this is the FR event pin.”

If many FR holds later: still one **active** map pin at a time (current design); tag identifies it vs fleet.

### B) Close FR must restore fleet map comfort

When operator hits **Close** on the FR card (or clears the FR anchor):

| Option | Behavior | Verdict |
|--------|----------|---------|
| **B1 Restore previous view** | Save center/zoom before FR `setView`; Close restores | Best — no surprise Fit pins |
| **B2 Auto Fit pins** | Close → `fitMapToFleetPins()` | Simple; may jump more |
| **B3 Leave zoom** | Today | Reject for ops |

**Recommend B1**, fallback B2 if no saved view.

Also: do **not** remove or hide other `deviceMarkers` on FR open/close.

### C) Optional (later)

- Pulse / ring on FR pin while active  
- Amber FR pin color (`mob-fr-map-pin-not-sos-red`) so red ≠ SOS  
- Keep popup open on first open (already does) + tag so click isn’t required to *identify*

---

## Proposed MOBs (parked)

### 1 — `mob-fr-map-pin-floating-tag` — **APPLIED**
- FR `divIcon` permanent floating label: **FR snap · {name}** (+ score)
- Click → existing popup card  

### 2 — `mob-fr-map-close-restore-view` (still parked — see RISK)
- Before FR `setView`, stash `{ center, zoom }`  
- On Close / clear FR anchor → restore stash (or Fit pins if stash missing)  
- Operator should not need Fit pins after every FR Close  

**Suggested order:** **1 then 2** (or one MOB if you want both in one APPLY — say so).

---

## Out of scope here

- Investigation holds load fail (restart / API)  
- Keep without crop (APPLIED)  
- Expand ~3× (APPLIED)  
- Many concurrent FR pins on map at once (future; today one active FR pin)

---

## No code in this DISC

## No code pending for floating tag

Restore-view still parked (see RISK). Reply **`MOB-APPLY mob-fr-map-close-restore-view`** when ready.
