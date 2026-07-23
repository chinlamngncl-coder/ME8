# MOB DISC — Soft Open wall PASS · pin FAIL (offline OSD / no pin video)

**Date:** 2026-07-17  
**Type:** Paper only — no code until named `MOB-APPLY`  
**Operator report:**
- Wall panel: **video up** (lower resolution) — progress **nice**
- Pin: **no video**
- Chin pin: shows **BWC offline**
- kk pin: shows **Live streaming…** OSD (stuck)

**Update:** APPLIED `mob-softopen-pin-mirror-from-video-v1` — re-test Chin pin after hard refresh.

---

## Verdict

| Surface | Result | Notes |
|---------|--------|--------|
| Soft Open **wall** | **PASS** (picture) | `mob-softopen-picture-mpegts-g711-v1` working; lower res = ZLM/substream — OK for now |
| Soft Open **pin** | **FAIL** | Pin path still expects wall **canvas mirror** (Firmware Gold) — Soft Open wall is **`<video>` mpegts**, not JSMpeg canvas |
| Chin **offline** label | **Separate** | Fleet “online” often YDT/Fleet SIP; Soft Open video is WVP GB — presence can lag or miss |
| kk **Live streaming…** | **Ghost OSD** | Invite/streaming chrome without live pin decode (kk often offline on WVP) |

**Do not** treat wall PASS as full Soft Open genre PASS until pin matches or we lock “wall-only Soft Open” on purpose.

Lower resolution: park. Do not chase HD until pin + stop + presence are clean.

---

## Why pin has no video (technical)

Firmware Gold pin live = **mirror wall canvas** (`startMapMirrorFromWall` → `map-pin-mirror-canvas`).

Soft Open wall:
- mpegts → `<video class="me8-zlm-soft-overlay">`
- **No** JSMpeg `canvas` in the slot
- `wallCanvasForCam` / mirror find **nothing** → pin stays empty or stuck on streaming label

Also Soft Open `onProven` sets `video-slot-has-live` but historically does **not** force `syncMapPopupPlayer` the same way Fleet JSMpeg decode does.

```
Wall Soft Open (video) ──✗──► Pin mirror (needs canvas)
Wall Fleet JSMpeg (canvas) ──✓──► Pin mirror
```

---

## Why Chin pin says offline

`mapPopupHtml` / offline popup uses **Fleet** online (`isCamOnlineOnFleet`).

Soft Open can show wall video from **WVP** while Fleet still thinks Chin is offline (no YDT / Fleet SIP presence). That is dual-protocol presence drift — not “cam is dead.”

Related prior work: `MOB-APPLIED-FLEET-PRESENCE-FROM-WVP-V1` (if present) / dual GB+YDT discs.

---

## Why kk shows Live streaming…

kk often not online on WVP; Soft Open / Open All may still set `streamingCams` or leave `.map-pin-streaming-label` (“Live streaming…”). Ghost pin cleanup covers Soft Open **fail**; it does **not** clear kk if something left invite chrome without a proven live wall.

---

## Next MOBs (pick order — then APPLY one)

### 1 — Soft Open pin video (recommended next)

**Name sketch:** `mob-softopen-pin-mirror-from-video-v1`

- When Soft Open wall is live (`<video>` overlay), pin mirrors **that video** (drawImage / captureStream / second softAttach on pin) — **or** attach Soft Open ZLM overlay on pin host when wall Soft Open proven
- Must not re-enable dual JSMpeg when wall is Soft Open
- Touch `video-wall.js` pin sync only with named APPLY (Firmware Gold aware)

Pass: Chin Soft Open → wall + **pin** both show picture.

### 2 — Presence: Soft Open live ⇒ pin not “BWC offline”

**Name sketch:** `mob-softopen-pin-online-from-wvp-live-v1`

- If wall Soft Open proven for cam → pin popup uses live chrome, not offline box
- Or refresh Fleet online from WVP register for that cam

Pass: Chin Soft Open live → pin does **not** say BWC offline.

### 3 — Clear kk / ghost Live streaming OSD

**Name sketch:** `mob-softopen-clear-idle-pin-streaming-osd-v1`

- Clear pin streaming label when cam not Soft Open / not wall-live
- kk offline → placeholder, not “Live streaming…”

Pass: kk pin no stuck Live streaming OSD when not live.

### Parked

- Higher Soft Open resolution / main stream — later
- YDT drop — **no**; keep GB+YDT

---

## Operator now (no APPLY)

1. Soft Open Chin — confirm wall still picture (regression check).  
2. Look at Chin pin: offline box vs empty video box — note which.  
3. Press **Stop** on wall — does Chin leave live on device? (prove stop bridge while wall PASS).  
4. Say which MOB to APPLY first (recommend **#1 pin video**).

---

## One line

**Wall Soft Open picture PASS; pin still blind (no canvas to mirror) + Fleet offline label + kk ghost OSD — next MOB = Soft Open pin from video.**
