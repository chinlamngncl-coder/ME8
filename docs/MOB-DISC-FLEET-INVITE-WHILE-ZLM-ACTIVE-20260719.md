# MOB DISC — Where does unrequested Fleet INVITE come from when ZLM is already active?

**Status:** DISC only — 2026-07-19 · **no APPLY** (answer for Google / operator)  
**Search:** invite requested, 408, ZLM primary, start-video, ensureInvite, residual Fleet  
**Related:** `MOB-APPLY-FRONTEND-ZLM-PRIMARY-V2`, `MOB-DISC-WHAT-PATH-WVP-ZLM-VS-FFMPEG-NOW-20260719.md`  
**Boundary:** Diagnose only — do **not** change failover / pin mirror / ZLM mount without a new named APPLY

---

## Short answer (for Google)

**Fleet INVITE does not come from the successful ZLM mpegts path.**  
It comes from a **separate client → server `start-video` → Fleet SIP INVITE** chain. That chain still runs when:

1. Wall ZLM primary **fails or is not ready yet** and falls back, **or**
2. **Another UI surface** (pin / SOS / FR / Command Wall) emits `start-video` while Ops already shows ZLM, **or**
3. A **race**: pin/open asks for Fleet before wall ZLM has registered the player.

Log line `invite requested` is always printed in `server.js` inside `startMediaFromDashboard` after socket `start-video` — not by the WVP/ZLM broker.

---

## Call chain (proof)

```
Client emit 'start-video'  (surface: ops | commandWall | fr | …)
    → server.js socket.on('start-video')
    → startMediaFromDashboard(…)
    → log: "invite requested"
    → Fleet SIP INVITE (lab often :5062) → often 408 if cams are on WVP :5060 only
```

Ops wall entry point for that emit:

| Function | File | Role |
|----------|------|------|
| `emitOpsStartVideo` | `public/js/video-wall.js` | `socket.emit('start-video', …)` |
| `ensureInvite` | same | calls emit when force / not already in `streamingCams` |
| `requestStreamForCam` | same | may call `ensureInvite` |
| `fallbackFleetJsmpeg` | same | **always** `ensureInvite` when ZLM mount returns false |

WVP/ZLM picture path:

| Function | Role |
|----------|------|
| `mountWallZlmPrimary` | broker `engine===zlm` → `softAttachZlmOverlay` — **no** `ensureInvite` on success |
| `/api/live/playback` / `tryWvpZlmPrimary` | FLV URL only — **does not** Fleet-INVITE |

So: **ZLM active on screen ≠ Fleet INVITE suppressed globally.** Only that one Open path skips INVITE on ZLM success.

---

## Origins when “ZLM is already active” (ranked)

### A) Wall fallback still fired (most common beside Open)

`assignCamToSlot` → wait ~300 ms → `mountWallZlmPrimary` → if `false` → `fallbackFleetJsmpeg()` → `ensureInvite`.

`false` when: factory not ready, broker not `engine:zlm` / no `flvUrl`, softAttach returns null, slot/token race.  
**Picture can still be ZLM from an earlier open or Soft path** while a **new** assign falls back and invites.

### B) Pin path race / side invite (strong residual)

`attachMapPopupPlayer` (Firmware Gold pin attach):

```js
if (!pinCanReusePoolWs(camId)) {
    requestStreamForCam(camId);  // → ensureInvite → start-video
}
```

`pinCanReusePoolWs` = wall player/ZLM overlay **or** `streamingCams` **or** Command Wall live.

During wall Open, ZLM mounts **after** the 300 ms timer + broker fetch. Until then:

- `players` / `zlmWallOverlays` may be empty  
- `streamingCams` not yet added (ZLM adds it **on success only**)

If pin Play / popup sync runs in that window → **Fleet INVITE while ZLM is about to (or already) paint.**

After ZLM success, pin should usually reuse (`wallHasPlayerForCam` / `streamingCams`). Residual invite = earlier race or mirror miss falling into JSMpeg pin path.

### C) SOS / alarm wall assign

SOS paths often use `forceInvite: true` / `assignCamToSlot(…, { alarm, forceInvite })`.  
Those are **requested** by alarm policy, not by ZLM — can still INVITE even if WVP stream exists.

### D) Other surfaces (not Ops wall Open)

| Emitter | File |
|---------|------|
| FR live watch | `public/js/fr-live-watch.js` → `start-video` |
| Command Wall | `public/js/command-wall.js` → `start-video` |
| `live.html` | standalone live page |

Any of these while Ops shows ZLM → second `invite requested` / 408.

### E) Not the origin

- `softAttachZlmOverlay` / mpegts play — no Fleet INVITE  
- Pin canvas mirror from ZLM `<video>` — no INVITE  
- Broker `tryWvpZlmPrimary` — WVP play API only  

---

## How to confirm in lab (operator / Google)

1. Reproduce Open / pin with ZLM picture + 408.  
2. Correlate timestamps: `invite requested` vs ZLM mount / FLV.  
3. Note **surface** on `start-video` (ops vs fr vs commandWall) if logged.  
4. Check whether invite is **before** ZLM `players.set` / `streamingCams.add` (race) or **after** a `mountWallZlmPrimary` false (fallback).

---

## What NOT to do without a new named APPLY

- Do not paste “gatekeeper” rewrites into `video-wall.js`  
- Do not change pin mirror / failover in this disc  
- Optional future APPLY (only if operator names it): e.g. treat ZLM wall as reuse for pin (`pinCanReusePoolWs` / skip invite when broker engine is zlm) — **separate MOB**, not auto

---

## One line

Unrequested Fleet INVITE = **client `start-video`** (fallback, pin race, SOS, FR, or CW) — **not** the active ZLM mpegts path; 408 is Fleet talking to cams that live on WVP.
