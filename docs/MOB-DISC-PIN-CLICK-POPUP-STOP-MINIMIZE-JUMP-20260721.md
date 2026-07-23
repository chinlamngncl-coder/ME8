# MOB DISC — Click pin = live popup · Stop = minimize · click does nothing · jump to top

**Date:** 2026-07-21 ~00:10  
**Status:** APPLY ordered — see `docs/MOB-APPLIED-PIN-CLICK-POPUP-OPEN-NO-DOCK-STORM-V1.md`  
**Operator:** *Click these 2 pins (Chin / kk) → live pin video must pop up. Stop video on pin → minimize. Now click = nothing. Still jumping to top. Do you know what is what?*

---

## Yes — that is the product (locked)

| Action | Must happen |
|--------|-------------|
| **Click map pin** (orange Chin / kk marker + name tag) | **Live pin video popup opens** (Call / PTT / Stop chrome) |
| **Stop live** on that pin | **Minimize** the pin popup — **wall panel keeps Live** |
| Map / pin layout | Must **not** jump to top / thrash dock on every click |

That is **day‑1 / classic**. Not optional. Not “mirror theory.”

Tonight’s `video-wall.js` graft did **not** remove the Leaflet `m.on('click') → openPopup()` in `index.html`. So if click feels like **nothing**, the bug is in **popup open / visibility / dock / block flags** — or popup opens empty so it looks like nothing — **not** “we forgot what a pin is.”

---

## What the code already claims (vs what you see)

| Piece | Code intent | Your FAIL |
|-------|-------------|-----------|
| Marker click (`index.html` ~10780) | `openPopup()` + sync pin video + dock | **Nothing** |
| Early return if `mapPopoutMirrorActive` | Blocks pin click on map-TV mirror mode | If stuck **true** → click dead |
| `Stop live` → `stopPinLive` | Destroy **pin** player only + `minimizeMapPinVideo` — **wall stays** | Correct design if Stop reachable |
| Click / `popupopen` | `assignColocatedPinPopupDocks()` **twice** (0ms + 120ms) | **Jump / snap to top** class |
| Wall Live ≥2 | `ensurePopups` + dock again | Extra open/dock storm → jump |

So: **Stop=minimize is already the coded rule.** **Click=popup is coded.** Your desk says both are broken in practice → **regression / storm / block**, not missing product knowledge.

---

## Likely causes (ordered — agent diagnosis)

### 1) Click blocked — `mapPopoutMirrorActive`

```js
if (window.mapPopoutMirrorActive) { stopPropagation; return; }
```

If map popout / mirror flag stuck on, **pin click does nothing**. Check: was Map popout / TV mirror used this session?

### 2) Popup opens but you see “nothing”

- Popup opens **off-screen / docked to wrong place** (“top”) after `assignColocatedPinPopupDocks` clears offsets  
- Or popup chrome with **no video host / empty** after WVP scar → looks like no popup  
- Or minimized class left on (`pin-popup-minimized`) without expand path winning  

### 3) Jump to top (separate from empty)

**Not Fit pins math rewrite.** Storm of:

- click → dock + delayed dock  
- `popupopen` → dock + delayed dock  
- wall prove / Open All → ensure popups + dock  

`assignColocatedPinPopupDocks` **resets dock plan** (and clears non–user-moved drag offsets) → popups **snap** (often feels like “jumped to top”).

That matches earlier WVP disc: jump ≠ delete auto-open; jump = **too many re-docks**.

### 4) Tonight’s pin MOBs

Linking classic `attachMapPopupPlayer` / mirror does **not** explain a total dead Leaflet click by itself. It can explain **empty video inside** popup. Your report “nothing happened” may mean **no visible popup at all** → prefer (1)/(2)/(3) over “classic link wrong.”

---

## What we must NOT do again

- Kill baseline pin open to “fix jump”  
- Yes-agent “will work” without your PASS  
- Hardcode Chin/kk  
- Pretend Stop should stop the wall (it must **minimize pin only**)

---

## One next APPLY (when you order — narrow)

**`MOB-APPLY PIN-CLICK-POPUP-OPEN-NO-DOCK-STORM-V1`**

| Fix | Detail |
|-----|--------|
| Prove click path | Marker click always `openPopup` unless geofence draw; clear stuck `mapPopoutMirrorActive` if not in mirror popout |
| Visible popup | After open, ensure popup element on-screen; expand if minimized |
| Stop | Keep **minimize only** (already `stopPinLive`); do not stop wall |
| Jump | On **user pin click**: **at most one** `assignColocatedPinPopupDocks` — remove immediate+120ms double (and popupopen double) that snap to top |
| Do not | Rewrite Fit pins / Open All / WVP FLV attach |

**PASS:** click Chin or kk → live pin popup visible; Stop → minimized; map does not jump to top.

---

## One line

**Click pin = live popup; Stop = minimize; your FAIL is click dead / empty / dock jump — next named fix is `PIN-CLICK-POPUP-OPEN-NO-DOCK-STORM-V1`, not another full pin rewrite.**
