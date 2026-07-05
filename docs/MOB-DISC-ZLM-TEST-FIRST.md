# MOB DISC — ZLM test-first (Google plan)

**Status:** Phase 1 applied (`mob-me8-zlm-backend-proof`) — backend + `test-zlm.html` only. **UI not touched.**  
**Search:** `ZLM`, `test-zlm`, `ffmpeg fallback`, `decoupled`, `zero UI touch`

**Today’s live video lock (do not break):** `me8-firmware-gold-20260706` — pin mirror, Open All PASS.

---

## What we are doing (plain English)

Google wants us to try **ZLM** (newer video path, H.264) as the main engine, with **FFmpeg** (what we use now, MPEG1) as backup if ZLM fails or is down.

We do this in **two steps**, not one big messy change:

1. **Backend + tiny test page** — prove video plays there first.  
2. **Main dashboard** — only after step 1 is proven. **Not before.**

---

## Hard rules (no exceptions)

| Rule | Meaning |
|------|---------|
| **No UI touch** | Do **not** edit `video-wall.js`, `index.html`, `fleet-ui.js`, map pins, or wall panels until the user says UI phase. |
| **Backend only** | Work in `server.js` + `lib/` modules only for phase 1. |
| **One test page** | Add `public/test-zlm.html` — standalone, not wired to the command wall. |
| **Proof before progress** | Agent must show logs: ZLM ingest alive + video plays in `test-zlm.html`. No proof = stop. |
| **No cheating** | No fake “works” flags, no hardcoded cam IDs, no skipping fallback test, no claiming PASS without video in the test page. |
| **One MOB at a time** | User says `MOB-APPLY` + MOB name. One fix per pass. |
| **Restore floor** | If live pins/wall break: `RUN RESTORE-ME8-FIRMWARE-GOLD` — not ZLM patches on top of a broken UI. |

---

## Google’s order (copy for next agent)

**Role:** Enterprise architect. ZLM primary, FFmpeg fallback.

**Forbidden until told otherwise:**
- `public/js/video-wall.js`
- `public/index.html` (pin sync block)
- `public/js/fleet-ui.js`
- Any map pin / wall panel wiring

**Allowed phase 1:**
- `server.js` (Google said `server_3.js` — **ME8 uses `server.js`**, same idea)
- New or updated files under `lib/` (ZLM adapter, fallback switch)
- `public/test-zlm.html` + `mpegts.js` vendor if needed
- Logs / health checks

**Task 1 — Proof of life**
1. Turn on ZLM sidecar in backend without breaking SIP/RTP paths we already use.
2. Logs show active ZLM ingest for a test cam.
3. `test-zlm.html` plays that cam — **no** command wall, **no** map pins.
4. Stop ZLM service → FFmpeg fallback runs → logs stay clean (no crash loop).

**Stop.** Wait for user to see video in `test-zlm.html` before any UI work.

---

## Why this order (Google)

- Last agent broke things by mixing backend + UI in one go (“fat view” spaghetti).
- If ZLM cannot play on a **simple** page, it will not work on Open All + pin mirror.
- Keeps Firmware Gold pin/wall **untouched** while we test the new pipe.

---

## What we have today (ME8)

| Piece | State |
|-------|--------|
| Live video (wall + pin mirror) | **Working** — Firmware Gold |
| FFmpeg / JSMpeg path | **Production today** — `lib/ffmpegRuntime.js`, `lib/mediaSession.js`, `lib/liveStreamPool.js` |
| ZLM in ME8 tree | **Not built yet** — roadmap says “later / sidecar”, not merged |
| `server_3.js` | **Does not exist** — use `server.js` |

Related doc (FFmpeg enterprise, separate lane): `docs/google-feedback-discussion/08-FFMPEG-DECOUPLE-BLUEPRINT.md`

---

## Phase gates (user signs each)

| Gate | User checks | Then |
|------|-------------|------|
| **A** | Video in `test-zlm.html` with ZLM on | OK to plan UI adapter MOB |
| **B** | Stop ZLM → FFmpeg fallback still plays in test page | OK to trust fallback |
| **C** | UI MOB (later) | Wall/pin integration — **new MOB name**, checkpoint ritual |

Until gate **A**: zero changes to locked pin/video files.

---

## Cheating (instant fail)

- Editing `video-wall.js` “just a small branch” during phase 1  
- Hardcoding lab cam IDs (Chin/kk) in backend or test page  
- Returning success without ingest logs + visible test-page video  
- Skipping FFmpeg fallback test  
- Bundling UI + backend in one MOB  

---

## When user says “move on”

Next real work starts with something like:

`MOB-APPLY mob-me8-zlm-backend-proof`

That MOB = phase 1 only (backend + `test-zlm.html`). Not UI.

---

## Related MOB DISC

- `docs/MOB-DISC-FIRMWARE-GOLD-PIN-MIRROR.md` — do not break pin mirror  
- `docs/MOB-DISC-GOOGLE-PIN-CANVAS-MIRROR-VERIFY.md` — Google pin questions (answered)  
- `docs/ME8-EIGHT-BWC-RULES.md` — one WS per cam, pin mirrors wall (UI phase must keep this)
