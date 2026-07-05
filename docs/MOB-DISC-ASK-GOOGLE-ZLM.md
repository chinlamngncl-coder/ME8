# MOB DISC — ask Google (consolidated paste)

**Date:** 2026-07-06  
**Search:** `ask google`, `Stopped by BWC`, `ZLM`, `unstable`, `paste`

**Two topics:** (1) ZLM path after our revert (2) intermittent **“Stopped by BWC”** on live wall

---

## Where we are

| Item | Status |
|------|--------|
| Open All + pin mirror | Checkpoint **PASS** at Firmware Gold lock — but **not stable day-to-day** |
| **“Stopped by BWC”** yellow overlay | Comes back **once in a while** while stream may still be running or recoverable |
| ZLM backend try | **Failed** — pool hooks reverted |
| Operator | Designer — **one pack at ship**, no Docker, no `.env` |
| TOTP | Suspended on bench — **on before ship** |

---

## Paste to Google (full block)

Copy from **Context** through **What we need back**.

---

### Context

We run **ME8** — enterprise dashboard for **8 body-worn cameras** (lab: 2 devices, colocated map pins).

**Working stack (Firmware Gold lock):**
- SIP/RTP from BWC → Node **`liveStreamPool`** → FFmpeg → MPEG1 → JSMpeg on **wall panel**
- Map pin = **canvas mirror** from wall (one WebSocket per camera — no second pin JSMpeg when wall is live)
- Cache bust: `video-wall.js?v=20260705-pin-mirror-complete`

**Hard constraints**
1. Customer gets **one install pack** — media runtime inside pack. **No** operator Docker / compose / second product.
2. **No UI edits** (`video-wall.js`, `index.html`) until backend proof on **standalone test page only** — unless you explicitly approve a **stability MOB** with file named.
3. After ZLM try: **do not hook `liveStreamPool`** until you define a safe boundary — pool touch caused immediate regression.
4. Bench operator is **not technical** — agent owns logs/restart; operator pass/fail only.

---

### Problem A — ZLM (reverted)

We attempted ZLM ingest per your decoupled plan (`lib/zlm*` + pool RTP listen hooks, ZLM env off). Within seconds of Open All, wall showed **“Stopped by BWC”** or **Stopped**. We **reverted** all `liveStreamPool` / `server.js` ZLM wiring. UI was never edited.

**Questions — ZLM**
1. Where should ZLM ingest attach on a Node stack that **already** runs per-camera FFmpeg in `liveStreamPool`? (**Not** our previous tee on pool RTP — what instead?)
2. Minimal **proof-of-life** before any UI work (log lines, test page, one cam) with **zero** Firmware Gold file edits?
3. FFmpeg fallback when ZLM down — backend-only design; same player vs different?
4. **One-pack ship:** how should ZLMediaKit ship (embedded `vendor/` binary, child process from `server.js`)? No operator-facing compose.
5. What must **never** be done again (pool `onSessionEnd` during SIP re-INVITE, etc.)?

---

### Problem B — intermittent “Stopped by BWC” (live instability)

UI string: **`video.stoppedOnDevice`** → **“Stopped by BWC”** (yellow overlay on wall/pin).

**Client triggers we know:**
1. Socket `video-stream-stopped` with **`reason: 'device_bye'`** → `markBwcStoppedOverlay()` (server: SIP BYE → `liveStreamPool.onRemoteBye` → emit `device_bye`). Server **keeps** pool session `dashboardActive` after BYE (SOS path).
2. **Stall watch:** if no decoded frame for **~2.8s** (`BWC_VIDEO_STALL_MS`) after first decode → same overlay (`ensureBwcStallWatch` / `noteVideoFrame`).

**Operator report:** Overlay appears **once in a while** during normal Open All / two-cam bench — not every time; feels **unstable** even after pin-mirror checkpoint PASS. Sometimes wall still looks like it was live; recovery unclear without full restart/restore.

**Questions — stability**
1. Is **2.8s stall → “Stopped by BWC”** wrong product semantics? (User did not stop on device — should this be “Signal lost” / reconnect / debounce instead?)
2. Can **SIP BYE** arrive mid-session (re-INVITE, firmware, colocated Chin+kk) while RTP/ffmpeg **still valid**? Should client **not** show device-stopped overlay on every `device_bye`?
3. With **pin canvas mirror**, is `noteVideoFrame` / stall watch tied only to wall JSMpeg — any gap where mirror shows wall but frame clock stalls → false overlay?
4. Open All **two live** cams: recommended **server + client** debounce / hysteresis before tearing down UI or showing BWC-stopped?
5. Should **ZLM migration wait** until Problem B has a signed stability gate — or can ZLM lab proceed in parallel with **zero** pool touch?

---

### What we need back

Please reply with:

1. **Ordered steps** (Step 1, 2, 3…) — one MOB at a time for our agent  
2. **Forbidden file list** until each gate passes  
3. **Gate A (stability):** Open All 2 cams, 10+ minutes, **no** spurious “Stopped by BWC”  
4. **Gate B (ZLM):** video on **test page only** (`test-zlm.html`), logs show ingest — **before** any dashboard integration  
5. Explicit **ship reminder:** TOTP on, one pack, no operator Docker  

---

## When Google answers

1. Agent saves → `docs/MOB-DISC-GOOGLE-ANSWER-<topic>.md` (or you paste in chat)  
2. Link from `MOB-DISC-START-HERE.md`  
3. **No code** until you say `MOB-APPLY` + MOB name from Google’s step list  
4. If wall breaks: **`RUN RESTORE-ME8-FIRMWARE-GOLD`**

---

## You do not need to ask Google about

- Pin mirror design (settled — unless Google ties it to Problem B)  
- TOTP (bench off; ship checklist covers re-enable)  
- Docker steps for yourself  

---

## Related

- `docs/MOB-DISC-FIRMWARE-GOLD-PIN-MIRROR.md`  
- `docs/MOB-DISC-ZLM-NOT-READY.md`  
- `docs/MOB-DISC-TOTP-SUSPENDED-BENCH.md`  
- `docs/ME8-EIGHT-BWC-RULES.md` — one WS, pin mirrors wall  
