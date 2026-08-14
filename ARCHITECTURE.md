# Mobility Axiom — System Architecture (LOCKED)

**Status:** LOCKED for enterprise suite + 1-click offline deployment  
**Date:** 2026-08-12  
**Scope:** ANPR · Facial Recognition · Weapons · Evidence Redaction · Tactical AR · Video Conferencing  
**Code freeze:** No executable changes from this document until a named `MOB-APPLY` for a specific phase.

This file is **architecture memory**. Agents and humans must obey these rules before touching ingestion, sidecars, or pack scripts.

---

## Unbreakable rules

### RULE 1 — STRICT SEPARATION OF CONCERNS

| Role | Runtime | Owns |
|------|---------|------|
| **Manager** | **Node.js** | UI, licensing, database, SIP routing, presence, Socket.IO, WVP/ZLM **control** (start/stop play, hand off URLs), Evidence/VC **orchestration** APIs |
| **Worker** | **Python** | AI inference, OpenCV, continuous video decode/process, YOLO/OCR/MMR/weapon/FR models |

- Node and Python are **independently compilable**: Node via bundle/`pkg`-class ship; Python via **PyInstaller** (or equivalent) sidecars.
- Do **not** merge AI loops into Fleet `server.js` / `run.js`.

### RULE 2 — NATIVE AI INGESTION (URL handshake)

1. Node **MUST NEVER**:
   - Process video frames for analytics
   - Run `ffmpeg` / FLV grabber **poller loops** for ANPR / FR / Weapon / similar
2. Node **MUST**:
   - Act as **license gatekeeper**
   - When licensed + operator watch is on: pass a **JSON payload** with stream URL(s) (RTSP/FLV/HTTP) + cam id + watch session meta to the Python sidecar
3. Python sidecar **MUST**:
   - Open the stream **natively** (e.g. `cv2.VideoCapture` or approved native capture)
   - Process frames **continuously in memory**
   - Return **JSON results** (detections / plates / faces / weapons / health) to Node
4. Node then persists, emits to UI, applies list/watchlist rules — **without** re-decoding video.

**Current debt:** Phase 1 native ingest APPLIED (`ANPR-NATIVE-INGEST-PHASE1-V1`). Legacy Node grab remains only behind `FM_ANPR_NATIVE_INGEST=0`.

### RULE 3 — PROTECT EXISTING MODULES

- URL-handshake applies to **all future refactors** of analytics ingest.
- Must **not** break or block:
  - Evidence Redaction  
  - Tactical AR  
  - Weapons Detection  
  - Facial Recognition  
  - Video Conferencing  
- Heavy work must stay **async / non-blocking** on the Node event loop (no synchronous polling that stalls SIP/UI).
- WVP/ZLM remains the live video base for operators; analytics **consumes URLs**, does not replace the wall player.

### RULE 4 — ZERO RUNTIME DEPENDENCIES (air-gap)

Designed for **offline / air-gapped** customer sites:

- No internet calls at runtime for weights, npm, or model downloads  
- No `npm install` on the customer box at start  
- No “download weights on first run”  
- Ship: bundled Node runtime + `node_modules` (or sealed blob) + PyInstaller sidecars + weights **inside the pack**  
- Aligns with existing 1-click / pre-ship gate practice (`build:ship`, pack bats, no client npm)

---

## Process map (target)

```
┌─────────────────────────────────────────────────────────┐
│  Node Manager (Fleet)                                   │
│  License · SIP · Presence · DB · UI sockets · WVP ctrl  │
│  Emits JSON: { camId, streamUrl, watchId, feature }     │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP/IPC JSON only
     ┌─────────────────────┼─────────────────────┐
     ▼                     ▼                     ▼
┌──────────┐        ┌──────────┐          ┌──────────┐
│ ANPR.py  │        │  FR.py   │          │ Weapon.py│
│ cv2+AI   │        │ cv2+AI   │          │ cv2+AI   │
└────┬─────┘        └────┬─────┘          └────┬─────┘
     │ JSON results      │                    │
     └───────────────────┴────────────────────┘
                           ▼
                    Node persists / UI emit
```

Evidence Redaction / Tactical AR / VC: stay on Node **orchestration** + existing media paths; any future CV work follows the same Worker rule (Python), never Node frame loops.

---

## Compile / pack intent (1-click offline)

| Artifact | Tooling intent |
|----------|----------------|
| Fleet Manager | esbuild/`run.js` or pkg-class; **no `lib/` source** in customer zip where pack rules say so |
| ANPR / FR / Weapon workers | **PyInstaller** (or locked equivalent) — self-contained exe + shipped weights |
| Start | One-click bats start Manager + required Workers; no internet |

---

# ANPR refactor blueprint — SAFE PHASE 1

**Goal:** Strip Node `ffmpeg`/FLV **poller** out of the backend; move stream ingestion entirely into the **Python ANPR sidecar**.  
**Constraint:** License gate + URL JSON from Node; continuous native capture in Python; JSON results back.  
**Do not execute until:** `MOB-APPLY ANPR-NATIVE-INGEST-PHASE1-V1` (or exact name you approve).

### Phase 0 — Freeze (now)

- No new Node grab features.  
- Document debt: `anprLivePollerRuntime` DropOldestQueue + `setInterval` grab; optional `anprIngestServiceMain` Node external service — both violate RULE 2 long-term.

### Phase 1A — Sidecar API (Python only first)

1. Add sidecar endpoints (names illustrative):
   - `POST /watch/start` — body: `{ camId, streamUrl, sessionId, options }`  
   - `POST /watch/stop` — body: `{ camId, sessionId }`  
   - `GET /watch/status` — active sessions, FPS, last error  
   - Existing `/health`, `/track`, `/read-macro` remain until cutover  
2. Implementation:
   - `cv2.VideoCapture(streamUrl)` (or approved native reader) per session  
   - In-process frame loop (thread/async) — **no Node JPEG poll**  
   - Stage 1 YOLO → plate path (keep current CCPD/FastALPR pipeline **inside** Python)  
   - Push or poll results: e.g. `GET /watch/events` or webhook `POST` back to Node localhost  
3. Ship weights **inside** sidecar pack (RULE 4).

### Phase 1B — Node Manager (thin handshake)

1. On Live ANPR watch: after license check, resolve **FLV/RTSP URL from WVP** (same source of truth as today).  
2. `POST` JSON to sidecar `/watch/start` — **no** `grabJpeg` / `ffmpeg` / DropOldestQueue.  
3. Subscribe to JSON events → existing rail emit / history / list match (reuse publish path).  
4. On unwatch / socket clear: `/watch/stop`.  
5. Remove or hatch-off: Node ingest service, fork child, runtime producer `setInterval` grab for ANPR.

### Phase 1C — Cutover & hatch

1. Env hatch: `FM_ANPR_NATIVE_INGEST=1` (new path) vs `0` (legacy Node grab — lab only).  
2. Default for ship: native ingest **on** after PASS.  
3. Delete/disable legacy grab only after PASS smoke (not in same MOB as first enable if risk is high — prefer enable+hatch, then remove MOB).

### Phase 1D — Pack / 1-click

1. PyInstaller recipe for ANPR sidecar (or interim: frozen venv until PyInstaller MOB).  
2. Start bat: Fleet + ANPR worker (native); **drop** `START-ANPR-INGEST.bat` once Node ingest is gone.  
3. Pre-ship gate: no runtime npm; no weight download; air-gap smoke.

### Phase 1 — Explicit non-goals

- Do not rewrite FR/Weapon in Phase 1 (same pattern later: `FR-NATIVE-INGEST`, `WEAPON-NATIVE-INGEST`).  
- Do not change SIP, WVP wall player, VC, Evidence redaction behavior.  
- Do not slow “FPS” via Node sleep — pacing lives in Python worker if needed.

### Phase 1 — PASS criteria (operator)

1. Fleet server stays up with Live ANPR on (no lost↔OK from ANPR grab).  
2. Plates/crops appear with watch on a live cam.  
3. Stop watch stops Python capture for that cam.  
4. Air-gap: no outbound model/npm fetch.

### Later phases (record only)

| Phase | Module |
|-------|--------|
| 2 | FR native ingest (URL → Python) |
| 3 | Weapon native ingest |
| 4 | Shared multi-analytic watch budget / session manager on Node |
| 5 | Full PyInstaller + Node sealed pack verification |

---

## Agent compliance

Before any ingestion/AI edit:

1. Re-read this file.  
2. Require exact `MOB-APPLY …` for code.  
3. Prefer Python Worker for frames; Node Manager for license + URL + UI.  
4. Never reintroduce Node `ffmpeg` analytics pollers.
