# MOB DISC — WVP/ZLM Primary + FFmpeg Fallback Architecture

**MOB:** `mob-wvp-zlm-ffmpeg-fallback-architecture`  
**Date:** 2026-07-15  
**Status:** APPLIED AS ARCHITECTURE ONLY — no runtime code change  
**Checkpoint before this MOB:** `f104cfa lab-fr-wvp-checkpoint: back up FR and WVP soft-live progress`

---

## Decision

WVP/ZLM is the target **scale live engine**. FFmpeg remains the **fallback live engine** and the proven safety path.

The production design is not a lab panel and not a separate customer-facing WVP website. The operator stays inside Mobility Axiom / ME8. The backend chooses the live engine and the UI receives one playback descriptor.

---

## What Passed

| Proof | Result |
|---|---|
| WVP/ZLM two BWC soft-live run | PASS, about 28 minutes |
| Mid stream unregister | None found |
| Mid offline | None found |
| End | Normal stop/BYE |
| ZLM recording | MP4 files emitted for both streams |
| Soft live edge | Operator reported better; no config change needed now |

Do not change `modify_stamp` or `lowLatency` from this result. The next risk is **fallback architecture**, not timestamp tuning.

---

## Core Architecture

```
BWC fleet
  -> ME8 live control plane
      -> WVP starts/scales GB live where media edge is enabled
      -> ZLM serves many browser viewers from one ingest
      -> FFmpeg remains fallback when media edge is unhealthy or unavailable
  -> ME8 dashboard / wall / FR / SOS / evidence UI
```

The product rule is:

```
one camera live intent -> backend live adapter -> playback descriptor -> player factory
```

The dashboard must not contain scattered engine logic. It asks the backend for what to play.

---

## Backend Contract

### Live Adapter

The backend owns the live-engine decision.

Expected contract:

```json
{
  "ok": true,
  "cameraId": "340200...",
  "engine": "zlm",
  "url": "/api/live/flv/...",
  "fallbackAvailable": true,
  "reason": null
}
```

or:

```json
{
  "ok": true,
  "cameraId": "340200...",
  "engine": "ffmpeg",
  "wsUrl": "ws://...:3989/?camId=...",
  "reason": "zlm_unhealthy"
}
```

### Fallback Rules

| Condition | Backend returns |
|---|---|
| ZLM healthy and stream ready | `engine: "zlm"` |
| ZLM process/API unhealthy | `engine: "ffmpeg"` |
| ZLM stream not ready after short wait | `engine: "ffmpeg"` |
| ZLM player fails after display | UI asks backend again; backend may return `ffmpeg` |
| Camera not live / cannot start | operator-safe error, not raw stack text |

All fallback flips must log:

```
live broker fallback { cameraId, reason }
```

---

## Important Gap

The current lab WVP tile fallback is:

```
ws_flv -> direct HTTP-FLV -> Fleet proxy to WVP FLV
```

That is **not** true FFmpeg fallback.

True fallback means FFmpeg can still provide a live picture after the WVP/ZLM media path fails. For production, the adapter must define the valid fallback source and must not call a ZLM-served URL "ZLM-down fallback":

1. **Preferred production path:** WVP/ZLM is primary, and ME8 automatically falls back to an FFmpeg source that remains valid when WVP/ZLM playback is unhealthy.
2. **Transitional lab path:** if fallback still depends on the existing Fleet FFmpeg pool, the UI must label that as transitional and must not sell it as final scale fallback.
3. **No silent split-brain:** a camera cannot have two independent live-control owners racing each other without the adapter owning start/stop/refcount.

---

## Functions That Must Stay Intact

| Function | Rule |
|---|---|
| Live wall / Open All | No wipe, no player storm, no blind replacement |
| Pin video | Preserve Firmware Gold mirror behavior until a named migration MOB |
| Cold PTT and missed alerts | Do not touch |
| SOS and alerts | Must still show in ME8 UI regardless of live engine |
| FR live watch | Must know which camera is live and still receive usable frames/snaps |
| Watchlist / evidence tags | Must remain ME8-owned, not WVP-owned |
| Auth / group scope | ME8 permissions decide who can watch |
| Recording policy | Server-side master recording is policy-controlled, not browser-dependent |

---

## Migration Shape

### Phase 0 — Current Lab

- WVP/ZLM lab validates stability and latency.
- Temporary lab panel remains only while proving.
- Existing FFmpeg wall remains safety.

### Phase 1 — Adapter Proof

Add a production-shaped backend descriptor path:

- `startLive(cameraId)` goes through adapter.
- Adapter starts WVP/ZLM primary when enabled.
- Adapter can return FFmpeg fallback descriptor.
- No customer-facing WVP UI.

### Phase 2 — UI Integration

- Dashboard uses one live-player factory.
- ZLM player appears only after it proves playback.
- FFmpeg fallback remains available and visible to the backend.
- Test panel can be removed after this is stable.

### Phase 3 — Remove Lab Trace

After production live path is proven:

- Remove temporary WVP two-tile panel.
- Remove test-page entry points from customer-facing UI.
- Keep builder/dev scripts only if hidden from customer pack.

---

## What Not To Do

- Do not merge WVP/ZLM by hacking `video-wall.js` directly.
- Do not require operators to use the WVP web page.
- Do not leave the lab panel in customer-facing software after production integration.
- Do not rely on browser-only fallback.
- Do not call current WVP tile chain "FFmpeg fallback"; it is WVP/ZLM playback fallback only.
- Do not tune `modify_stamp` just because warning lines exist when soft-live is passing.

---

## Next MOB Candidates

| MOB | Purpose |
|---|---|
| `mob-wvp-live-adapter-contract-v1` | Implement backend descriptor contract for primary/fallback live engine |
| `mob-wvp-ffmpeg-fallback-source-proof` | Prove what stream/source FFmpeg fallback uses when primary is WVP/ZLM |
| `mob-wvp-dashboard-player-factory-v1` | UI consumes descriptor and can swap/fallback without wall wipe |
| `mob-wvp-remove-lab-test-panel` | Remove temporary WVP two-tile panel after production path is proven |

Recommended next: **`mob-wvp-ffmpeg-fallback-source-proof`** before UI migration. Without this proof, "FFmpeg fallback" is only a phrase.

---

## Plain Operator Meaning

We are not stopping at a lab test. The target is:

**WVP/ZLM for scale, FFmpeg as safety, ME8 as the only operator product.**

Fallback must be owned by ME8 backend logic. If ZLM fails, the operator should still see video through the fallback path, and all ME8 functions must continue to work.
