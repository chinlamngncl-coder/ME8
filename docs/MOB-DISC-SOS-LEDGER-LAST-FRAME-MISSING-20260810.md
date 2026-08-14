# MOB DISC — SOS ledger last-frame missing / white — 2026-08-10

**Status:** LOCKED diagnose. **No code this turn.**  
**Read:** `.cursorrules` · CREDIT-LEAN · not related to CleanData/StopRecord genre.

---

## What you expect (day-1 function)

On SOS / Ack, HQ grabs a **last live frame** from the BWC and stores `snapshot.jpg` on the SOS ledger card.

---

## Evidence (today’s ledger on disk)

| Incident (local) | `snapshot` field | `snapshot.jpg` |
|------------------|------------------|----------------|
| Most of today (e.g. 21:02, 20:35, …) | **null** | **NOFILE** |
| 21:23:28 (one hit) | URL present | **1043 bytes** ≈ blank/white JPEG |

So: usually **nothing saved**; when something saves it is **near-empty white** — matches what you see.

---

## How it is supposed to work (still in code)

| Step | Where |
|------|--------|
| SOS raise / Ack open | `stashSosAckSnapshot` / early `liveFramePreviewDataUrl` in **`public/index.html`** |
| Grab pixels | `VideoWall.liveFramePreviewDataUrl` / `captureLiveFrameForCam` in **`public/js/video-wall.js`** |
| Needs | A **canvas** with decoded video (`findLiveCanvasForCam` → wall JSMpeg canvas or pin canvas) |
| Ack submit | `snapshotBase64` → `POST /api/sos-acknowledge` → `sosIncidents.saveDashboardSnapshot` |

Server path for Ack snapshot is **fine**. Failure is **client capture returning null or tiny white**.

---

## Why it broke (root cause — WVP handoff)

Comment already in `video-wall.js`:

> **WVP handoff wall player — mpegts on `<video>`, no JSMpeg canvas.**

`findLiveCanvasForCam` only looks for **canvas**. Under WVP/FLV live, wall (and often pin mirror) is **`<video>`**, not JSMpeg canvas →:

1. At SOS raise: often **no live yet** → early stash null.  
2. When live is up: **no canvas** → `liveFramePreviewDataUrl` null → Ack checkbox “no video” / no base64.  
3. Or a **black/white empty canvas** (mirror not painted) → ~1KB JPEG → white thumb in ledger.

Day-1 worked on **JSMpeg canvas** path. Handoff to **FLV `<video>`** never got a matching “draw video → JPEG” for SOS stash. StopRecord/CleanData work did **not** remove this feature; handoff made the old canvas grab useless.

---

## Not the cause

- CleanData / StopRecord / mute-hold  
- Ledger HTML “broken” alone (files really missing / tiny)  
- Server forgetting `saveDashboardSnapshot` when base64 is sent

---

## Fix shape (APPLY later — not now)

**`SOS-LEDGER-LAST-FRAME-FLV-V1`** (name suggestion)

1. In `liveFramePreviewDataUrl` / `captureLiveFrameForCam`: if no canvas, sample **`<video>`** (wall FLV / pin) via temp canvas `drawImage(video)`.  
2. Optionally re-stash **1–2s after** live shows (SOS auto-open), not only at raise.  
3. Reject frames below size / mostly-white threshold so ledger does not store 1KB blanks.  
4. Do **not** touch Firmware Gold pin-mirror attach cores beyond a safe frame read.

**Risk:** low if only capture helpers change; no stop-video / DeviceControl.

---

## Next step

Say **`MOB-APPLY SOS-LEDGER-LAST-FRAME-FLV-V1`** when you want that capture fix.
