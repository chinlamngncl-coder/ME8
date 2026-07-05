# MOB DISC — ZLM architecture proposal (design review)

**Status:** **PROPOSAL ONLY** — awaiting your reply **“Approved”** before any MOB-APPLY or code.  
**Mode:** Architecture-first. **No patches** to `video-wall.js`, `server.js`, `liveStreamPool.js`, or operator config.  
**Search:** `ZLM architecture`, `adapter`, `design review`, `Approved`

**Reads:** `docs/MOB-DISC-ZLM-NOT-READY.md`, `docs/MOB-DISC-ASK-GOOGLE-ZLM.md`

---

## Executive summary (plain English)

1. **Do not touch Firmware Gold live path** (`liveStreamPool`, wall, pins) for ZLM lab work.  
2. **Fix “Stopped by BWC” flicker first** (Gate A) — separate MOB genre; ZLM lab can run in parallel only with **zero pool edits**.  
3. ZLM ships as a **program inside the one customer pack** (child process), **not** Docker for the operator.  
4. **FFmpeg fallback** is decided by a **backend adapter**, not `if/else` inside `video-wall.js`.  
5. **Proof** = video on `test-zlm.html` + logs, with today’s dashboard still on Firmware Gold.

---

## Order of work (gates)

| Gate | What | Touches dashboard? |
|------|------|-------------------|
| **A — Stability** | Open All 2 cams, 10+ min, no false “Stopped by BWC” | Maybe `video-wall.js` **only** with named MOB + your approval |
| **B — ZLM lab** | `test-zlm.html` plays live cam via ZLM path | **No** — new files + lab relay only |
| **C — Adapter wire** | Server uses adapter; dashboard still JSMpeg | **No** — `server.js` thin glue only |
| **D — UI player** | Wall/pin use adapter playback descriptor | **Yes** — later MOB, checkpoint ritual |

**ZLM does not start Gate C until Gate B passes.**  
**Gate A should pass before Gate D** (recommended; can debate with Google).

---

## Why pool hooks failed

BWC sends **one RTP stream** to **one port** per live session. Our failed MOB hooked **inside** `liveStreamPool` (RTP listen / session end). That sat on the same code path as SIP re-INVITE, BYE, and FFmpeg lifecycle → wall showed **Stopped by BWC** within seconds.

**Rule:** `liveStreamPool.js` stays **Firmware Gold** until a future MOB explicitly replaces it via adapter migration — not tee hooks.

---

## Target architecture (three layers)

```
  BWC ──SIP/RTP──►  [ Ingest layer ]  ──►  [ Playback broker ]  ──►  Browser
                         │                        │
                    FFmpeg (today)            test page (lab)
                    ZLM (lab → prod)          dashboard (later)
```

### Layer 1 — Ingest (backend only)

**Today (unchanged):** `liveStreamPool` — SIP invite, RTP, FFmpeg, MPEG1 WebSocket fan-out.

**ZLM add-on (new, separate modules):**

| Piece | Role |
|-------|------|
| `lib/zlmProcess.js` | Start/stop/health of ZLMediaKit **binary** from `vendor/zlmediakit/` (child process — same idea as FFmpeg in pack) |
| `lib/zlmIngestLab.js` | Talk to ZLM REST (`openRtpServer`, etc.) — **no** import from `liveStreamPool` |

**How ZLM gets video without pool hooks (lab proof):**

- **Lab relay (Gate B):** A small **standalone** script (`scripts/lab/zlm-ws-relay.js` or similar) — **not** wired into `server.js` at first:
  - Operator starts live on **normal dashboard** (pool untouched).
  - Relay **subscribes** to existing `ws://host:3989/?camId=…` as a client.
  - Relay **pushes** into ZLM (RTMP or FLV publish API).
  - `test-zlm.html` plays ZLM HTTP-FLV.
- Proves ZLM + player + pack layout **without** changing SIP/FFmpeg internals.
- Logs: `zlm health ok`, `relay first frame`, `flv play ok`.

**Production ingest (Gate C+, later MOB):** Only after lab PASS — introduce **`lib/liveMediaAdapter.js`** so `start-video` / `stop-video` call the adapter, not raw pool+ZLM mix. Adapter chooses driver; pool code moved behind `FfmpegDriver` wrapper — **one MOB**, reversible.

### Layer 2 — Playback broker (backend only)

**New:** `lib/livePlaybackBroker.js`

- Input: `camId`
- Output: **playback descriptor** (JSON), e.g.  
  `{ engine: 'ffmpeg', wsUrl: '…' }` or `{ engine: 'zlm', flvUrl: '…' }`
- Rules:
  - If ZLM unhealthy → **ffmpeg** descriptor only (automatic).
  - If ZLM healthy and session has ZLM publish → **zlm** descriptor.
  - Read-only queries to pool (`isStreamingForCam`) — **no** RTP hooks.

**Test page (Gate B):** `GET /api/lab/playback?camId=` → broker (new route, lab-only flag).  
**Dashboard (Gate D):** Same broker — `video-wall.js` only **asks** descriptor and loads player — no engine logic scattered in UI.

### Layer 3 — Browser player (later)

**New small file:** `public/js/live-player-factory.js` (not editing mirror logic in `video-wall.js` until Gate D MOB).

- `createPlayer(descriptor, canvas | video element)`
- JSMpeg for `ffmpeg`, mpegts.js for `zlm`
- Pin mirror rule unchanged: **one owner per cam** — pin still mirrors wall canvas when wall uses wall player.

---

## FFmpeg fallback (no UI spaghetti)

| Wrong | Right |
|-------|--------|
| `if (zlm) … else …` inside `video-wall.js` | Broker returns **one** descriptor; factory picks player |
| ZLM fail → blank wall | Broker returns `engine: 'ffmpeg'` when ZLM down |
| Operator toggles `.env` | Builder profile + **Settings → Media engine** (future) — status line “ZLM: running / fallback FFmpeg” |

Fallback chain (server):

1. ZLM process health check fails → FFmpeg only.  
2. ZLM up but no publish for cam → FFmpeg only.  
3. ZLM publish stall N seconds → broker flips descriptor to FFmpeg for **new** viewers (existing WS may drain naturally).

Log every flip: `live broker fallback { camId, reason }`.

---

## ZLM “sidecar” without Docker (one pack)

| Item | Plan |
|------|------|
| Binary | `vendor/zlmediakit/MediaServer.exe` (Windows ship); Linux analogue in same pack |
| Start | `lib/zlmProcess.js` spawns child on Fleet boot **only if** media profile enables ZLM (builder-set, not operator Docker) |
| Ports | Localhost HTTP API + FLV; no extra operator install step |
| Config | `vendor/zlmediakit/config.ini` shipped in pack; secret rotated at install |
| Operator | **Nothing** — same `NEW-ME8-INSTALL.ps1` + `RESTART-FLEET.bat` |

Docker compose files in repo = **builder dev only** — never in customer handoff doc.

---

## SIP / FFmpeg path — non-interruption rules

1. **No edits** to `liveStreamPool` for Gate B.  
2. SIP INVITE / BYE order unchanged in `server.js` until Gate C MOB.  
3. `mediaSession.js` must not consume pool BYE first (existing rule).  
4. ZLM lab relay is **downstream consumer** of WS — does not change RTP ports or SIP SDP.  
5. No `onSessionEnd` / `onRtpListening` hooks in pool (forbidden — caused FAIL).

---

## Forbidden until you say “Approved” + named MOB

| File | Until |
|------|--------|
| `public/js/video-wall.js` | Gate D MOB |
| `public/index.html` | Gate D MOB |
| `lib/liveStreamPool.js` | Adapter migration MOB (post Gate B) |
| `server.js` start-video path | Gate C MOB (thin adapter wire) |
| Operator Docker / compose | **Never** |

**Allowed for Gate B only (after Approved):**  
`scripts/lab/*`, `lib/zlmProcess.js`, `lib/zlmIngestLab.js`, `lib/livePlaybackBroker.js`, `public/test-zlm.html`, lab API route behind `FM_LAB_ZLM=1` builder flag.

---

## What I need from you

Reply **“Approved”** to this plan — or **“Approved Gate B only”** to limit scope to lab relay + test page.

Until then: **no code, no commit, no pool touch.**

---

## Open questions (for Google or next design pass)

1. Is WS→ZLM relay acceptable for Gate B proof, or must RTP enter ZLM natively on day one?  
2. Gate A (BWC flicker) MOB before any ZLM — confirm?  
3. Single broker descriptor vs dual simultaneous (FFmpeg + ZLM) for transition period?

---

## Related

- `docs/MOB-DISC-ZLM-NOT-READY.md` — FAIL post-mortem  
- `docs/MOB-DISC-ASK-GOOGLE-ZLM.md` — paste to Google  
- `docs/MOB-DISC-BWC-STOPPED-FLICKER.md` — Gate A  
- `docs/MOB-DISC-FIRMWARE-GOLD-PIN-MIRROR.md` — pin mirror lock
