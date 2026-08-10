# MOB DISC — How to MOB-APPLY + Fixed cam Ops pins (already done?) (2026-08-07)

**Status:** disc only. No code.

---

## Part A — How to MOB-APPLY (simple)

1. We talk / write a **Mob disc** (names the work).  
2. You type **exactly one** line, for example:

```text
MOB-APPLY WEAPON-LIGHTBOX-POS-KEEP-V1
```

   or `go ahead` / `apply` for that **same** named item.  
3. Agent changes **only that** MOB. You restart / hard refresh / pass-fail.  
4. Next MOB = new `MOB-APPLY …` (one at a time).  
5. Git push only when you say e.g. `MOB-APPLY lab-git-push-…` for a genre.

**Do not** paste a whole queue as one APPLY. Pick the next name from the arrange list.

### Current arranged next (Weapon)

| Order | Type this when ready |
|-------|----------------------|
| Done | `WEAPON-ALARM-TOAST-BLINK-V1` |
| **Next** | `MOB-APPLY WEAPON-LIGHTBOX-POS-KEEP-V1` |
| Then | `MOB-APPLY WEAPON-TILE-CLICK-EXPAND-V1` |
| Later | Colab B negatives (you) → `WEAPON-ALARM-BACKUP-PTT-V1` → Keep evidence |

---

## Part B — Fixed camera PIN on Ops (not BWC)

### Confirm — you already have this

Registration (Settings → Fixed cameras) **requires lat/lng** + **map icon** type. Ops map draws a **different pin** from BWC.

| Piece | Exists? | Where |
|-------|---------|--------|
| Register fixed cam + GPS | Yes | `fixed-cams-ui.js` — lat/lng required on save |
| **Different pin look** | Yes | Cyan “camera” teardrop — not BWC officer pin |
| Icon variants | Yes | `mapIcon`: fixed / dome / ptz / traffic / building (colours differ) |
| Map legend | Yes | `#map-pin-legend` · `.leg-fixed-camera` |
| Click pin → see cam | Yes | Fixed-cam popup stage (video / location); wall slot hides PTT/call for fixed |

CSS already in `index.html` (`.fixed-camera-map-pin`, `.icon-dome`, `.icon-ptz`, …).

**BWC** = GPS officer pins (fleet markers).  
**Fixed** = site cameras with admin lat/lng + mapIcon.

### How you use it on Ops

1. Register cam with map position (or map pick).  
2. Ops map shows the fixed pin (different colour/shape).  
3. Click pin → popup / live path (playable stream).  
4. Can also put fixed cam on video wall like other playable sources.

### Weapon / toast link

Weapon **Show on map** should focus that **same** fixed pin when hit cam is `fixed:…` (not only BWC). Toast MOB already aims at BWC **or** fixed — lab-prove on a registered fixed cam.

### If something is missing in lab (only then a MOB)

| Pain | Possible later MOB |
|------|---------------------|
| Pin missing after save | Fix map refresh after fixed-cam save |
| Click does not open live | Fixed-cam popup play path |
| Weapon Show on map misses fixed | `WEAPON-SHOW-MAP-FIXED-PIN-V1` |

**Default:** no new pin MOB — treat pins as **done** unless you FAIL one of the pains above.

---

## One next APPLY (Weapon UI)

`MOB-APPLY WEAPON-LIGHTBOX-POS-KEEP-V1`
