# MOB DISC — Map FR pin: “Nothing to keep”, tiny Expand, red dot

**Status:** DISC · **`mob-fr-map-keep-require-crop` APPLIED** · **`mob-fr-map-snap-real-expand` APPLIED** (~3× bubble, not full window) · pin color still parked  
**Date:** 2026-07-13  
**Trigger:** Operator opens FR snap on map → red pin popup → **Keep** → toast **“Nothing to keep”**; **Expand** only grows the pic a little (“cartoon”); asks why pin is red.  
**Search:** Nothing to keep, fr-snap-map, Expand, red dot, cropUrl, keepEvidencePack  
**Related:** `mob-fr-snap-map-anchor-card` · `mob-fr-snap-keep-evidence-pack` · `mob-fr-kept-evidence-ui` (APPLIED)

---

## What you saw (lab truth)

| Symptom | What it is |
|---------|------------|
| Red circle on the road | **FR snap map marker** — deliberate rose/red pin (`#e11d48`), not a bug and not SOS |
| Tiny dark popup with **Keep** / **Close** | Leaflet popup for that pin (`fr-snap-map-popup`) |
| Toast **Nothing to keep** | `keepEvidencePack` refused or failed — almost always **no usable face crop URL** |
| Expand feels like a “cartoon” postage stamp | Expand is **not** a real maximize — it only bumps CSS max size inside the map bubble |

Blue squares nearby = normal BWC / fleet pins. **Red = this FR hold pin** so it stands out from the fleet.

---

## 1) Why “Nothing to keep”

Keep path (map):

```
Keep click → FrAlarm.keepEvidencePack(frSnapMapSlot)
         → needs frSnapMapSlot.cropUrl
         → fetch(cropUrl) → POST /api/analytics/fr/kept
```

Fail toast **“Nothing to keep”** when:

| # | Cause | How it feels |
|---|--------|----------------|
| A | Slot has **no `cropUrl`** (GPS-only open, empty rail slot, stale object) | Popup may show **no image** — Keep is still shown (bug of honesty) |
| B | `cropUrl` **expired / 404** (temp crop path gone) | May have shown a pic earlier; Keep then fails with same vague toast |
| C | POST `/api/analytics/fr/kept` fails (auth, FR license, body) | Same toast — message is too blunt |
| D | `frSnapMapSlot` cleared / null (popup rebound, Close, next snap) | Rare mid-click race |

**Lab screenshot reading:** popup with **buttons only, no face crop** strongly matches **(A)** — Keep was offered without a crop to save. That is a product bug: **do not show Keep (or disable it) when there is nothing to pack.**

Server folder / Investigation holds UI are fine; this is **upstream of Keep**.

---

## 2) Why Expand looks “cartoon”

Current Expand is a **CSS toggle** on the same Leaflet card:

| State | Cap (approx) |
|-------|----------------|
| Default | `max-width: 280px`, img `max-height: 160px` |
| Expanded | `max-width: ~420px`, img `max-height: min(42vh, 320px)` |

So Expand ≈ “slightly less tiny bubble,” **not** a lightbox / full-screen review.

Face crops are often **small resolution**; `object-fit: contain` + black box → looks like a **sticker / cartoon stamp**. Operators expect Expand ≈ **big review** (old float / lightbox feel).

---

## 3) Why red dot (by design)

```css
.fr-snap-map-marker-icon {
  background: #e11d48; /* rose/red */
  border: 2px solid #fff;
}
```

| Color | Meaning |
|-------|---------|
| Blue / fleet markers | Cameras / devices |
| **Red FR pin** | “This GPS is an FR snap event — look here” |

Not SOS. Not “error.” Intentional contrast.  
If red feels like SOS confusion → later MOB can switch to **amber / magenta FR brand** pin + label (“FR snap”), still distinct from blue fleet.

---

## 4) Product gaps (honest)

| Gap | Severity |
|-----|----------|
| Keep enabled with empty crop | High — causes your toast |
| Fail toast always says “Nothing to keep” | Medium — hides 404 vs license vs empty |
| Expand ≠ real maximize | High — matches “cartoon little bit of pic” |
| Popup can look like Keep/Close only | High when crop missing — feels broken |
| Red vs SOS confusion | Low–medium (training / pin color) |

---

## Proposed MOBs (parked — pick one when ready)

### A — `mob-fr-map-keep-require-crop` — **APPLIED**
- Map popup: **Keep** omitted when no `cropUrl`; amber hint in meta; Expand disabled without crop  
- `keepEvidencePack`: no vague “Nothing to keep” — distinct toasts for no crop / crop gone / save fail / not licensed  

### B — `mob-fr-map-snap-real-expand` — **superseded**
- Was ~3× Leaflet balloon — clipped by top nav  
- Replaced by **`mob-fr-map-expand-side-dock`** (side dock + tether inside map pane)  

### C — `mob-fr-map-pin-not-sos-red` (optional polish)
- Change pin to FR amber/magenta + short title in popup (“FR snap”) so it never reads as SOS  

**Suggested order:** A → B → C.

---

## Not this DISC

- Investigation holds Evidence tab (`mob-fr-kept-evidence-ui`) — already APPLIED; separate from empty crop  
- FR match / re-enroll gallery — separate  
- Soft reconnect / refresh wipe — separate  

---

## No code pending for A/B

C still parked. Hard refresh to pick up Expand CSS.
