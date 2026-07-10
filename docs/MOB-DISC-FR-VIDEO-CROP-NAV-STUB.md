# MOB DISC — Video face crop · partial faces · body attrs · nav order · remove FR/ANPR stub

**Status:** Open — discuss; **do not MOB-APPLY yet**  
**Date:** 2026-07-10  
**Search:** `offline video`, `partial face`, `investigation thumb`, `ReID`, `nav analytics`, `autoFacePlate`  
**Related:** live poll · enroll cropper · watchlist dossier · FR LIVE-POLL roadmap

---

## 1) Can we crop faces from video now?

| Path | Today | Notes |
|------|--------|--------|
| **Live BWC watch** | **Yes** | Frame grab → detect → face crop → crop rail / alarm |
| **Still / ID enroll cropper** | **Yes** (just applied) | Manual frame + preflight |
| **Offline file “Load video”** | **No** | Button exists, **disabled** stub — not wired |
| **FTP / face-plate inbox → FR** | **Not yet** | Folder exists; not FR queue (`mob-fr-ftp-inbox` parked) |

So: **live video faces already crop.**  
**Offline popular video → sample frames → crops** is the next product MOB (roadmap item), not “flip a switch.”

**Suggested later MOB:** `mob-fr-offline-video-crops` — allow-list mp4/mov → ffmpeg sample N fps → same probe/crop path as live → stack + optional watchlist add.  
Depends on FR sidecar running; cap duration/size so lab PCs don’t melt.

---

## 2) What does our FR algo actually do with faces? (honest)

**Stack (legal for lab):** DeepFace (**MIT**) + **Facenet / SFace** only · detector default **opencv** · **VGG-Face forbidden**.

| Behaviour | Reality |
|-----------|---------|
| Pose / “degrees” gate | **No explicit yaw/pitch limit** in our code |
| Detect | OpenCV (or configured) finds a face box; `enforce_detection=True`, `align=True` |
| Partial / 2⁄3 face | **Sometimes yes, sometimes no** — if detector returns a box, we crop it. Profile / heavy occlusion often → `no_face` |
| Enroll | Hard: **1 face**, face ≥ **160**, soft blur/lighting |
| Live probe | Largest face if several; **no** enroll A2 gate on live crops |
| Match % | Cosine → %; threshold (e.g. 70–75%) decides **alarm**, not whether a crop can exist |

### Your idea: keep thumbs even if &lt; 80% match — **correct product pattern**

| Tier | Use |
|------|-----|
| **Match ≥ threshold** | Alarm + watchlist hit (today) |
| **Face detected, score below threshold** | **Investigation thumb** — keep crop + time + cam + score for review (not alarm) |
| **No face** | No crop |

**Today:** crop rail shows detections/matches; we do **not** yet have a durable “investigation gallery” of sub-threshold faces.  
**Worth doing** with offline video + live: soft lane = store crop metadata without claiming identity.

Does **not** require a new commercial FR engine — same Facenet path, different **policy** (save vs alarm).

---

## 3) Full-body crop + clothes / attributes — “super to have”

| Capability | Now? | License-free path | Commercial later |
|------------|------|-------------------|------------------|
| Face box crop | Yes | Current stack | Same / better detector |
| Expanded “bust” crop (face + shoulders) | Easy | Pad facial_area × 1.5–2 | — |
| Full-body person box | No | Needs **person detector** (e.g. open YOLO-class, check license) | Buy stack |
| Clothes / colour / bag attributes | No | Research OSS attribute / ReID nets — **license audit required** | Buy attribute/ReID stack |

**Recommendation:**

1. **v1 video crops** — face (current) + optional **context pad** (torso) for investigation thumbs.  
2. **Park body+attributes** until commercialisation — don’t bolt random OSS ReID into ME8 without a license pass.  
3. When you buy stacks: face FR + optional ReID/attributes as **add-on modules** under Analytics license flags (same pattern as `fr` / `anpr`).

Not a must for watchlist identity; strong for “who was near the gate in the blue jacket.”

---

## 4) Move Analytics to last tab (after Settings)

**Current order:** Ops · Evidence · **Analytics** · Command Wall · (Centre) · VC · **Settings**

**Requested:** … · Settings · **Analytics** (rightmost / last)

| Risk | Level | Notes |
|------|-------|--------|
| Break live FR / watchlist | **Low** | View IDs (`app-view-analytics`, `nav-tab-analytics`) unchanged — only **DOM order** of nav buttons |
| Break Settings | **Low** | Same |
| Deep links / training screenshots | **Low–Med** | Docs/screenshots show old order |
| Keyboard / “next tab” muscle memory | **Low** | Operators relearn once |
| License gate / hub JS | **None expected** | No index-based tab array found for Analytics |

**Safe MOB later:** `mob-ui-nav-analytics-last` — move `#nav-tab-analytics` after `#nav-tab-server` in `index.html` only. Verify: open Analytics, Start watch, Watchlist, Settings still work.

**No** need to touch `video-wall.js` / SIP / FR sidecar.

---

## 5) Remove “Face Recognition / ANPR” on map toolbar

That control is **not** the Analytics tab. It is a **disabled stub** next to Lock/Unlock:

```html
<label><input type="checkbox" disabled> Face Recognition / ANPR</label>
```

(`map.autoFacePlate` — never wired; `aria-disabled` slot.)

| Risk if removed/hidden | Level |
|------------------------|--------|
| Harm live FR / Analytics | **None** — stub has no JS handler |
| Harm Lock/Reboot/Shutdown | **None** if only that `.auto-capture-slot` is removed |
| Harm real face-plate storage folder | **None** — separate `storage/face-plate` + storage button |

**Safe MOB:** `mob-ui-hide-map-faceplate-stub` — **applied 2026-07-10** (`hidden` on `.auto-capture-slot`).  
Real FR stays under **Analytics**. ANPR stays “coming when licensed” inside Analytics.

---

## Suggested apply order (when you say MOB-APPLY — one at a time)

| Priority | MOB | Risk to core ops |
|----------|-----|------------------|
| 1 | `mob-ui-hide-map-faceplate-stub` | None |
| 2 | `mob-ui-nav-analytics-last` | Very low |
| 3 | `mob-fr-offline-video-crops` | Medium (ffmpeg + sidecar load) — after UI tidy |
| 4 | `mob-fr-investigation-thumbs` | Low–Med — policy: keep sub-threshold crops |
| Later | Body / attributes | Park until commercial stack |

Do **not** bundle with pin-fan or enroll cropper follow-ups in the same pass.

---

## Bottom line

| Question | Answer |
|----------|--------|
| Crop from video now? | **Live yes**; **offline file not yet** (button stub) |
| 2⁄3 face still crop? | **If detector sees it** — yes crop; match may be weak — **keep as investigation thumb** is the right product idea |
| Full body + clothes? | **Super**, not must — park OSS ReID; buy later |
| Analytics last tab? | **Yes, low risk** — DOM order only |
| Remove map FR/ANPR stub? | **Yes, safe** — dead checkbox, not real FR |
| Harm function? | UI moves/removes above: **no** if scoped; offline video MOB needs soak |

Reply with which MOB to apply first (suggest stub hide + nav last, then video crops).
