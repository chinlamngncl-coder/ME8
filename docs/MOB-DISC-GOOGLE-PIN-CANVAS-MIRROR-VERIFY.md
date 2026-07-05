# MOB DISC — Google AI canvas mirror verification (2026-07-06)

**MOB DISC ONLY — no code in this doc.** Answers for Google AI bench review.  
**Shipped MOB:** `mob-me8-pin-mirror-complete` (not `mob-me8-pin-canvas-mirror` — same intent, different name).  
**Lock:** `me8-firmware-gold-20260706` — operator checkpoint **PASS** (Open All, Chin + kk colocated pins).  
**Search:** `canvas mirror`, `WebSocket count`, `drawImage`, `zombie`, `Open All`, `Google verify`

**Related:** `docs/MOB-DISC-FIRMWARE-GOLD-PIN-MIRROR.md`

---

## Google question 1 — WebSocket count (Open All, one WS per cam?)

### Design standard (ME8 rule 1)

| Layer | Expected |
|-------|----------|
| Server pool / SIP | **One live session per cam** |
| Browser JSMpeg | **One `ws://…?camId=` per cam** — owned by **wall panel** |
| Map pin | **Zero** extra WS when mirror path is active — pin copies wall canvas via RAF + `drawImage` |

### What the code does

- Happy path: `attachMapPopupPlayer` sees `wallCanvasForCam` + `wallSlotDecodedForCam` → `destroyMapPlayer` → `startMapMirrorFromWall` — **no** `attachCanvasPlayer` on the pin.
- `camHasActiveLiveVideoSurface`: when `mapPinMirrorActive(camId)`, pin-only JSMpeg canvas is **not** counted as a live surface.

### Honest caveats (agents must not ignore)

| Caveat | Detail |
|--------|--------|
| **Fallback pin JSMpeg** | If wall has a player but **has not decoded yet** (`wallHasPlayerForCam` && !`wallSlotDecodedForCam`), pin may show streaming overlay or briefly use pin `attachCanvasPlayer` — **second client WS risk** until wall decodes and mirror wins. |
| **`pinCanReusePoolWs`** | Pin-only open without wall may attach JSMpeg reusing pool — still one server session, but pin WS exists. Open All path should wall-first. |
| **Client cap debt** | `MAX_LIVE_STREAMS = 6` in `video-wall.js` — product spec is **8**; not aligned in this lock. Affects UI cap, not mirror logic per se. |
| **Command wall / other surfaces** | Extra viewers can add WS — Ops Open All + pins should still be **one owner per cam** on the ops wall. |

### Bench answer (checkpoint PASS scope)

For **Open All with wall panels live + pins mirroring** (Chin + kk lab): **yes — target is one WebSocket per camera on the server/browser for the wall owner.** Pin mirror does not open a second WS in that state.

**Agent verify (owns logs — not operator):** Open All 2 cams → server/pool logs should show **2** sessions, **not 4**. If 4, mirror path lost — read `MOB-DISC-FIRMWARE-GOLD-PIN-MIRROR.md` before patching.

---

## Google question 2 — State sync (wall decode → pin video; race / hang?)

### How mirror sync works

1. Wall JSMpeg decodes → wall canvas `width/height > 8`.
2. `startMapMirrorFromWall` RAF loop: `drawImage(srcCanvas)` → first good frame adds `mapPinDecodedCams`, hides overlay/placeholder.
3. `index.html` `syncPinVideoFromWall` → `VideoWall.syncMapPopupPlayer` → `attachMapPopupPlayer`.
4. Guards: `preparePinVideoWallResync` **does not** strip when mirror active, wall decoded, or wall has player; **never** strips `map-pin-mirror-canvas`.

### What caused hangs before (do not re-introduce)

- Dual pin JSMpeg (second WS) — starvation.
- `preparePinVideoWallResync` stripping pin canvas every sync — **destroy loop**.
- Blind `mapPlayers.has` early return — blocked reattach.

### Residual race (known, acceptable at checkpoint)

| Window | Behavior |
|--------|----------|
| Wall invited, not decoded | Pin may show **“Live streaming…”** until `wallSlotDecodedForCam` — not a permanent hang if guards hold. |
| Popup not in DOM yet | `syncPinVideoFromWall` 80ms / 450ms retry when wall live but pin not live and not mirroring. |

### Bench answer

**Checkpoint PASS:** wall decode → pin shows video reliably for Open All (including colocated Chin + kk).  
**Not claimed:** zero ms race globally on slow decode — overlay may show briefly, then mirror wins.

---

## Google question 3 — Zombie recall (Stop tears down mirror without server re-stream?)

### Stop paths

| Action | Mirror | Server stream |
|--------|--------|----------------|
| **Wall / operator stop** (`emitOpsStopVideo`) | `video-stream-stopped` → `teardownWallPin` → `destroyMapPlayer` + `resetMapPopupVideo` → `stopMapPinMirror` | Stopped via server |
| **Pin stop only** (`stopPinLive`) | `destroyMapPlayer` + `resetMapPopupVideo` → mirror RAF cancelled | **`releaseServerStreamIfIdle`** — wall may stay live if ops wall still claims cam |
| **Popup close** | `cleanupMapPinPlayerOnPopupClose` — pin canvas/mirror cleared | Idle release if wall does not claim |

### Anti-zombie guards

- `isPinVideoStoppedByUser` → `syncPinVideoFromWall` **returns early** — no auto re-mirror after user pin stop.
- `localDashboardStopCams` wins on `video-stream-stopped` race.
- `preparePinVideoWallResync` will not strip mirror canvas or re-open pin WS when mirror is active.

### Bench answer

**Operator stop (wall or fleet stop):** mirror stops; stream tears down; **no** verified zombie re-INVITE at checkpoint.  
**Pin-only stop while wall still live:** mirror stops on pin; **wall may keep streaming** by design — not a zombie, intentional split. Agent must not “fix” that without explicit MOB.

### Do not do

- Re-add 450ms repair loops that call `attachCanvasPlayer` on pin while wall is live.
- Strip `map-pin-mirror-canvas` on wall sync events.

---

## Google question 4 — Mirror loop health (`drawImage` / uninitialized canvas)

### Code behavior (`startMapMirrorFromWall`)

```text
if (sw > 8 && sh > 8) → drawImage(srcCanvas, …)
else → skip frame, RAF continues
if (!host.isConnected || !srcCanvas.isConnected) → stopMapPinMirror(camId)
```

- No `drawImage` on zero/tiny canvas — avoids most uninitialized-source errors.
- No try/catch — browser rarely logs if draw skipped; **checkpoint did not report drawImage console failures**.
- Mirror canvas class: `map-pin-mirror-canvas` (distinct from `map-pin-video-canvas` JSMpeg pin).

### Bench answer

**At checkpoint PASS:** no operator-visible pin black-screen from drawImage failures.  
**Agent spot-check:** DevTools console during Open All — expect **no** repeating `drawImage` InvalidStateError if implementation unchanged.

---

## Summary table for Google AI

| Check | ME8 standard met? | Checkpoint | Agent must verify on bench |
|-------|-------------------|------------|----------------------------|
| 1 WS per cam (Open All + mirror) | **Yes** (design + PASS path) | PASS (2-cam lab) | Pool log count = cam count |
| Wall decode → pin video | **Yes** with brief overlay possible | PASS | Open All colocated pins |
| Stop → no zombie re-stream | **Yes** for operator stop | PASS | Stop all → no ghost INVITE |
| drawImage / canvas health | **Gated** in code | PASS (no reports) | Console clean on Open All |

---

## If Google / next agent sees FAIL again

1. **Do not rename MOB** and patch blind — restore floor: `RUN RESTORE-ME8-FIRMWARE-GOLD`.
2. Read `docs/MOB-DISC-FIRMWARE-GOLD-PIN-MIRROR.md` (mistakes list).
3. One MOB-APPLY at a time; operator restart + refresh once only.

**Operator is not tech** — Google-style verification (logs, WS count, console) is **agent-owned**, not operator homework.
