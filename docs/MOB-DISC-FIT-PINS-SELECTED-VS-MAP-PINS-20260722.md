# MOB DISC — Fit pins says “need 2” while Chin + kk both show

**Status:** DISC locked — **no APPLY** until you say the phrase  
**Date:** 2026-07-22  
**Trigger:** Operator screenshot — map shows **Chin** + **kk** pins, **Fit pins** toast: *“Fit check: fewer than two selected BWC GPS positions are available.”*  
**Related:** Lock/unlock GPS replay (`WVP-PRESENCE-REPLAY-GPS-ON-ONLINE-V1` still queued); HUB-UI PASS pending separately.

---

## Plain English

| What you see | What the button actually does |
|--------------|-------------------------------|
| Two orange pins on the map (Chin + kk) | Fit pins looks at **fleet list ticks** (`FleetUi.getSelectedCamIds`), **not** “pins drawn on the map” |
| Toast: “fewer than two **selected** …” | That word **selected** = ticked on the left fleet list (for Snapshot / remotes), not “I can see two pins” |

So this can be true at the same time:

- GPS is on, both pins drawn → **map looks fine**
- Only **one** BWC is ticked in the fleet list (normal when using Snapshot / SD record) → Fit pins only counts that one → toast

**Not** “kk GPS is fake.” The map already has both. Fit’s **counting rule** is wrong for how you use the button.

---

## Code (live path)

`public/index.html` → `fitMapToFleetPins()`:

1. `pinned = FleetUi.getSelectedCamIds()`  
2. If any ticks → only those IDs  
3. Else → all `deviceMarkers`  
4. Toast if fewer than **two** IDs with usable GPS **pairs** for the diagnostic  
5. Button label/title says “Fit pins” / “all pinned … or all on map if none pinned” — “pinned” here means **fleet ticks**, which operators read as **map pins**

Diagnostic toast was added for pin-spread debugging; it now **feels like a hard fail** even when the map already shows two units.

---

## Why it feels broken after “kk is back”

Unlock/presence can restore the **map pin**. Remotes still leave **one** cam selected. You click **Fit pins** expecting “zoom to Chin + kk.” Code hears “fit my one selected BWC” → toast.

---

## Product lock (agent pick)

**Fit pins = fit what is on the map** (every marker with GPS in `deviceMarkers` / map-positions cache).

| Keep | Change |
|------|--------|
| Fleet ticks for Snapshot / Record / Lock | **Do not** use fleet ticks to shrink Fit pins |
| Toast only when map truly has &lt; 2 GPS points | Honest wording: “Need 2 GPS pins on the map” — drop misleading “selected” |

Optional later (not this MOB): a separate “Fit selection” if ops ever want tick-only zoom.

---

## Recommended MOB

**Name:** `FIT-PINS-MAP-MARKERS-NOT-FLEET-TICKS-V1`

### In scope

1. `fitMapToFleetPins` — build points from **all map markers with GPS** (ignore fleet selection for Fit).  
2. Toast: only when &lt; 2 map GPS points; text matches that.  
3. i18n title: “Zoom to all BWC pins on the map” (no “selected/pinned” confusion).  
4. Keep console `[PIN-FIT-TRACE]` for lab if useful; don’t scare operators with false “need 2” when 2 pins are visible.

### Out of scope

- Lock/unlock GPS replay (separate MOB)  
- Chin video open/close  
- Hub UI Detail/theme (already APPLIED)  
- Changing which pins the map **draws**

### Risk

**Low** — client map zoom only. One Ctrl+F5 verify.

### PASS later

| # | Test | Pass |
|---|------|------|
| 1 | Chin + kk both on map, **one** fleet tick → Fit pins zooms to **both** | ☐ |
| 2 | No toast “fewer than two selected…” when two pins visible | ☐ |
| 3 | Only one pin on map → toast/zoom single is honest | ☐ |

---

## APPLY phrase (when ready)

**`MOB-APPLY FIT-PINS-MAP-MARKERS-NOT-FLEET-TICKS-V1`**

Until then: disc only — no code.

---

## Queue note (seven-issues track)

Still waiting after this (unchanged order aside from inserting Fit when you want it):

1. HUB-UI Detail/theme — APPLIED (confirm PASS)  
2. **This Fit pins MOB** (if you want it next — highest “strange” now)  
3. `WVP-PRESENCE-REPLAY-GPS-ON-ONLINE-V1`  
4. Centre Summary load error clear  
5. Remotes log proof / Chin video soak
