# MOB DISC — WVP tile ws-flv player (root path, not reopen)

**Status:** APPLIED 2026-07-14 — prove soak pending  
**Date:** 2026-07-14  
**Search:** `ws-flv`, `ws_flv`, `root fix`, `WVP same player`

**APPLY done.** Operator: restart Fleet → hard refresh → Play A+B → **> 30 min** soak → PASS/FAIL.

---

## Why this MOB (not more reopen)

You said it correctly: **reopen is a patch.**  
This MOB is the **first root-direction fix**: play the stream the **same way WVP’s own Play path exposes it** — **WebSocket FLV** (`ws_flv`) — instead of HTTP FLV through mpegts + long-lived HTTP read that dies in Opera / on Tile B.

| Path | Role |
|------|------|
| HTTP FLV direct | Latency win (done) — still can drop reader |
| Fleet proxy | Fallback only |
| **ws_flv** | **WVP/ZLM native live read** — target for stability |

---

## What WVP already gives us

On `/api/lab/wvp/play` today, WVP returns (example):

- `flv` — `http://192.168.1.38/.../xxx.flv`
- **`ws_flv`** — `ws://192.168.1.38/.../xxx.flv` ← **use this first**
- `fmp4`, `hls`, `rtsp` — later if ws fails

We already store `raw.ws_flv` in `wvpLabClient.js` but **tiles never use it**.

---

## What we will change (one MOB scope)

**When you say MOB-APPLY:**

1. **`lib/wvpLabClient.js`** — expose `wsFlv` (host-rewritten like HTTP) on play response  
2. **`public/js/wvp-lab-tile.js`** — playback order:  
   **ws_flv → http direct → Fleet proxy**  
   Same mpegts player (`type: 'flv'`, url `ws://…`) — **no new vendor JS**  
   Keep: `hasAudio: false`, nomute-stall, auto-reopen as **safety until soak PASS**  
3. Lab kill switch: `FM_WVP_WS_FLV=1` (default on when `FM_LAB_WVP=1`)  
4. Cache bust on `wvp-lab-tile.js`

**Not in this MOB:** wall, Open All, jessibuca embed, fmp4, ship pack.

---

## Why ws may help stability (honest)

- HTTP live FLV = one long HTTP body; browser/Opera can stall the reader → ZLM drops player, cam keeps pushing  
- WebSocket FLV = live socket model closer to what many WVP desks use; often **better under two concurrent tiles** and long watch  
- **Not guaranteed** — if soak still fails, next root step is ZLM keepAlive desk tune or fmp4 player MOB  

We **remove or reduce reliance on reopen** only after **30+ min two-tile soak PASS** on ws path.

---

## What you do (only this)

1. Say **`MOB-APPLY mob-wvp-tile-ws-flv-player`** (or **go ahead**)  
2. Hard refresh dashboard  
3. Play A + B on lab panel  
4. Leave **> 30 min**  
5. **PASS** = both stay live without constant blink/reopen  
6. **FAIL** = say which tile died  

No logs. No WVP website. No Open All.

---

## Pass / fail bar

| | |
|---|---|
| **PASS (this genre)** | ws path in use; two tiles stable **30+ min**; latency still good |
| **FAIL** | Tile B (or either) still dies ~5 min; reopen firing every few min |
| **Not FAIL** | One brief reopen after hours — watch for pattern |

---

## Forbidden

- Declaring “production stable” on ws swap alone without soak  
- More `liveBufferLatencyChasing`  
- Pool FFmpeg / Open All  
- Operator OSD / measure docs  

---

## Related

- Reopen = patch: `docs/MOB-DISC-WVP-REOPEN-IS-PATCH-NOT-STABLE.md`  
- Stability: `docs/MOB-DISC-WVP-TILE-STABILITY-FIX.md`  
- Latency PASS: `docs/MOB-DISC-ZLM-LATENCY-HANDOVER.md`
