# MOB VMS Baseline Discovery
## Mobility Axiom — Fixed Camera & VMS Capability Map
**Date:** 2026-08-20  
**Mode:** Read-only static analysis  
**Files scanned:** `lib/fixedCamOnvif.js` · `lib/fixedCamRegistry.js` · `lib/liveStreamPool.js` · `server.js` (fixed-cam routes)

---

## Pillar 1 — ONVIF & RTSP Transport

### What Exists

| Feature | Status | Location |
|---------|--------|----------|
| ONVIF Profile S detection (Media + PTZ) | ✅ Implemented | `fixedCamOnvif.js` L197–226 |
| ONVIF Profile T detection (Media2) | ✅ Detected | `fixedCamOnvif.js` L199–200 |
| ONVIF Profile G detection (Edge Recording / Replay / Search) | ✅ **Detected only** — not acted on | `fixedCamOnvif.js` L205, L216 |
| ONVIF Profile M detection (Analytics / Metadata) | ✅ **Detected only** — not acted on | `fixedCamOnvif.js` L208–212 |
| `GetStreamUri` → RTSP URI fetch | ✅ Implemented | `fixedCamOnvif.js` L457 |
| RTSP URI credential injection | ✅ Implemented | `fixedCamOnvif.js` L32–37 |
| RTSP stream URI cache (5-min TTL) | ✅ Implemented | `fixedCamOnvif.js` L18, L441 |
| Fallback to manual RTSP URL if ONVIF fails | ✅ Implemented | `fixedCamOnvif.js` L470–488 |
| `resolveStreamUri` → ZLM/FFmpeg → live wall tile | ✅ Implemented | `liveStreamPool.js` + `server.js` |
| Camera clock sync (anti-replay, SetSystemDateAndTime) | ✅ Implemented | `fixedCamOnvif.js` L8–9 |

### Gap — Sub-stream / Main-stream Duality

`getStreamUri` (line 457) is called **without a `profileToken` parameter**. The ONVIF library picks whichever profile is first or default. There is no logic to:
- Enumerate all available media profiles (`getProfiles`)
- Separate **main stream** (high-res, 4K/1080p for recording) from **sub-stream** (low-res, 480p for live wall tile)
- Route each to a different consumer (wall tile gets sub-stream, NAS writer gets main stream)

**This is the single largest gap for enterprise VMS scaling at 64+ cameras.**

---

## Pillar 2 — PTZ & Imaging Capabilities

### What Exists

| Feature | Status | Location |
|---------|--------|----------|
| `ContinuousMove` (pan/tilt/zoom) | ✅ Fully wired | `server.js` L6807 |
| `GotoPreset` | ✅ Fully wired | `server.js` L6790 |
| `SetPreset` (save a view) | ✅ Fully wired | `server.js` L6794 |
| `GetPresets` | ✅ Fully wired | `fixedCamOnvif.js` L317 |
| `GotoHomePosition` | ✅ Fully wired | `server.js` L6785 |
| `Stop` (PTZ stop) | ✅ Fully wired | `server.js` L6782 |
| Dead-man stop (auto-stop after 750ms timeout) | ✅ Implemented | `server.js` L6811–6814 |
| PTZ rate limiting (70ms debounce) | ✅ Implemented | `server.js` L6776 |
| PTZ session cache | ✅ Implemented | `fixedCamOnvif.js` L490–499 |
| License gate (`ptzControl` feature flag) | ✅ Gated | `server.js` L6764 |
| Audit log on every PTZ command | ✅ Implemented | `server.js` L6816 |
| Pull-Point event subscriptions (motion / line crossing / tamper) | ✅ Implemented | `fixedCamOnvif.js` L373–411 |
| Event classification (motion / line_crossing / tamper / analytics) | ✅ Implemented | `fixedCamOnvif.js` L342–353 |

### Gap — Imaging Controls

**Not implemented:**
- `GetImagingSettings` / `SetImagingSettings` — no API for brightness, contrast, sharpness, white balance, IR cut
- `AbsoluteMove` and `RelativeMove` — only `ContinuousMove` is wired; click-to-point PTZ targeting is not possible
- `GetStatus` — no PTZ position feedback (current pan/tilt/zoom coordinates not read back)
- Focus control (`GetFocus`, `SetFocus`, `MoveOptions`) — no focus API

These are differentiators for law enforcement high-value target tracking (click-to-center, autofocus).

---

## Pillar 3 — Recording & Storage Pipelines

### What Exists

| Feature | Status | Location |
|---------|--------|----------|
| BWC FTP ingest → evidence storage | ✅ Implemented | `lib/ftpIngest.js` + `server.js` |
| Evidence live-capture path config (`liveCapturePath`) | ✅ Configurable | `server.js` L4328–4360 |
| FFmpeg live-capture sidecar (BWC → MP4 to disk) | ✅ Implemented | `liveStreamPool.js` L342–348 |
| Profile G (Edge Recording) detection on ONVIF connect | ✅ Detected | `fixedCamOnvif.js` L205 |

### Gap — Fixed Camera Recording (Critical)

**Not implemented for fixed cameras:**
- **No continuous NAS recording** — FFmpeg live-capture is only wired for BWC streams, not fixed RTSP cameras
- **No ONVIF `StartRecording` / `StopRecording`** commands sent to camera
- **No NVR-style Schedule** — no time-based or event-triggered recording schedule
- **No SD card retrieval** — Profile G `GetRecordingInformation`, `GetRecordings`, `FindRecordings` are not called even when the camera reports `hasRecording: true`
- **No event-triggered recording** — motion / line-crossing events (which are wired) do not trigger a recording clip

The architecture currently treats fixed cameras as **live-view only** devices. All evidence storage is BWC-centric.

---

## Pillar 4 — Playback & Timeline

### What Exists

| Feature | Status | Location |
|---------|--------|----------|
| `livePlaybackBroker` — WVP/ZLM FLV live playback descriptor | ✅ Implemented | `server.js` L4565, L5018 |
| `GET /api/live/playback` — live FLV URL for wall tile | ✅ Implemented | `server.js` L5017 |
| `GET /api/lab/playback` — ZLM-only dev playback path | ✅ Implemented | `server.js` L4629 |
| Evidence file download (range-request, 206 partial content) | ✅ Implemented | `server.js` L7591 |

### Gap — Historical / Archive Playback (Critical for VMS)

**Not implemented:**
- **No camera-side archive search** — `FindRecordings`, `GetRecordingInformation`, `GetReplayUri` (ONVIF Profile G) are not called
- **No server-side timeline** — no database table storing recording segments with start/end timestamps per camera
- **No scrubber/seek API** — `GET /api/fixed-cams/:id/playback?start=ISO&end=ISO` does not exist
- **No continuous NAS stream to index** — even if recording were implemented, there is no segment indexing layer

Current architecture is **strictly live-feed only for fixed cameras**. There is no historical playback path at any layer.

---

## Gap Summary Table

| Gap | Priority | Complexity | Competitive Value |
|-----|----------|-----------|------------------|
| Dual-stream profile selection (main vs. sub) | **Critical** | Medium | Scale to 64+ cameras without bandwidth explosion |
| Fixed camera continuous NAS recording (FFmpeg → MP4 segments) | **Critical** | Medium | Core VMS feature — no recording = no VMS claim |
| ONVIF Profile G retrieval (SD card playback) | **High** | Medium | Edge-storage recall for law enforcement chain of custody |
| Timeline / recording index database | **High** | High | Enables scrubber UI, clip export, audit |
| Historical playback API (`/api/fixed-cams/:id/playback`) | **High** | Medium | VMS UX parity with Milestone/Genetec |
| `AbsoluteMove` / `RelativeMove` (click-to-point PTZ) | **High** | Low | Law enforcement target lock-on |
| PTZ `GetStatus` (position feedback) | **Medium** | Low | Real-time PTZ coordinate display |
| `GetImagingSettings` / `SetImagingSettings` (IR, brightness) | **Medium** | Low | Tactical night vision control |
| ONVIF event → recording trigger (motion-clip) | **Medium** | Medium | Smart recording — only saves when something happens |
| ONVIF `FindRecordings` + replay search API | **High** | High | True VMS search and instant replay |

---

## Agent Recommendations — Killer Specs to Beat Genetec/Milestone

These are features that the incumbent enterprise VMS vendors handle poorly or charge separately for. Building them natively into Mobility Axiom creates defensible competitive moat.

### 1. BWC + Fixed Camera Unified Timeline
Genetec and Milestone treat body cameras and fixed cameras as completely separate systems. Axiom already has both in one platform. A single timeline scrubber that shows BWC evidence clips AND fixed camera segments side-by-side — correlated by officer GPS + camera geofence — is a capability neither competitor offers out of the box.

**Implementation:** Unified `recordings` table in `siteDb` with `sourceType: 'fixed' | 'bwc'`, `camId`, `startAt`, `endAt`, `segmentPath`. One timeline API for both.

### 2. AI-Assisted Smart Recording (Event-Triggered)
Fixed cameras detecting motion via ONVIF events (already wired) should trigger a 30-second pre-buffer + clip save, not continuous recording. This eliminates terabytes of dead footage, reduces storage cost by 80–90%, and is exactly what law enforcement wants for court export.

**Implementation:** Ring buffer in `liveStreamPool` for fixed RTSP streams + ONVIF event → flush trigger.

### 3. Officer Correlation — Camera + BWC + GPS at One Incident
When a SOS event fires or a tactical operation opens, automatically surface: (a) nearest fixed camera live view + 60-second pre-event clip, (b) the officer's BWC live view, (c) ANPR hits from the last 5 minutes in the geofence. Competitors require manual camera switching. This is one click in Axiom.

### 4. ONVIF Profile M — AI Metadata Streaming (Already Detected, Not Used)
Cameras that report `profileM: true` (analytics-capable) can stream ONVIF metadata events with bounding boxes, object classifications, and tracking IDs over the RTSP metadata channel. Ingest this alongside the video and Axiom becomes an AI-aware VMS without running a separate GPU server for every camera.

**Implementation:** Subscribe to RTSP metadata track alongside video, parse `tt:VideoAnalytics` XML, push to FR/ANPR/weapon alert pipeline.

### 5. Sub-stream Live Wall + Main-stream NAS Write (Dual-Path)
The single most common enterprise VMS failure mode: 64 cameras × 8Mbps main stream = 512Mbps to the server. Axiom must route the **sub-stream** (512Kbps) to the live wall tile and the **main stream** to NAS. This requires:
- `getProfiles` → enumerate all tokens
- UI configuration: select main token + sub token per camera
- FFmpeg spawns two processes: one for NAS write (no transcode, copy), one for live wall (transcode to MPEG1 or FLV)

### 6. Zero-Trust Camera Authentication
Current: ONVIF credentials stored in registry JSON. Roadmap: rotate camera passwords automatically on schedule using `SetUser` ONVIF command, store only encrypted credential in DB. This is a compliance requirement for ISO 27001-aligned customers (law enforcement, government). Genetec charges separately for their credential vault module.

### 7. Tamper Detection → Immediate Operator Alert
ONVIF tamper events are already classified (`kind: 'tamper'`) in `fixedCamOnvif.js` but not routed anywhere beyond `console.log`. Wire this to the SOS / alert system: a camera covered or defocused triggers an immediate operator notification with the camera ID, live view, and event timestamp.

---

## Architecture Blueprint — Recommended Build Order

```
Phase 1 (Foundation):
  1a. getProfiles → enumerate main/sub profile tokens, store in fixedCamRegistry
  1b. Dual-spawn FFmpeg: sub-stream → live wall, main-stream → NAS MP4 segments
  1c. recordingSegments table in siteDb (camId, startAt, endAt, path, size)

Phase 2 (Playback):
  2a. GET /api/fixed-cams/:id/segments?from=ISO&to=ISO → segment list
  2b. GET /api/fixed-cams/:id/playback/:segmentId → range-request MP4 serve
  2c. Timeline UI: unified scrubber (fixed + BWC, correlated by time)

Phase 3 (Smart Recording):
  3a. ONVIF event → ring buffer flush (pre-event clip, configurable window)
  3b. Profile G → GetRecordings + GetReplayUri → SD card recall API
  3c. Motion-event → recording trigger → segment index

Phase 4 (Imaging & Control):
  4a. AbsoluteMove + GetStatus (click-to-point PTZ)
  4b. GetImagingSettings / SetImagingSettings (IR, brightness, focus)
  4c. ONVIF tamper → SOS alert wire

Phase 5 (AI & Metadata):
  5a. Profile M RTSP metadata subscription
  5b. ONVIF AI metadata → FR/ANPR/weapon alert pipeline
  5c. Officer correlation engine (SOS + nearest fixed cam + ANPR geofence)
```

---

*Discovery by static analysis — no code modified. All line numbers reference the live ME8 workspace root.*
