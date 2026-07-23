# MOB DISC — Google post-adapter handoff: pin-first still fails due pending retry/re-entry above playOnMapPopup

**Date:** 2026-07-21 ~10:33  
**Status:** `RESTORE-FLEET-PIN-FIRST-WVP-ADAPTER-V1` operator FAIL  
**Scope:** DISC only — no further product code change  
**Call Step 2:** NOT started

---

## What was applied before this failure

Only `public/js/video-wall.js` was changed:

1. `wvpVideoHandoffUi` now stores `server-capabilities.wvpVideoHandoff`.
2. `playOnMapPopup()` still:
   - requests the stream
   - reserves the wall slot
   - calls `assignCamToSlot`
3. Under WVP, `playOnMapPopup()` now:
   - shows “Live streaming...”
   - does not create/attach the direct pin JSMpeg canvas
4. Popup cleanup checks existing wall pending/live ownership before releasing.
5. Existing FLV `onProven → syncMapPopupPlayer(camId)` remains.

Syntax and lint passed. Operator test still failed.

---

## New runtime evidence from the failed test

Dashboard connected after hard refresh:

```text
10:32:04 dashboard connected
```

One pin-first attempt generated multiple WVP start requests for the same camera:

```text
10:32:06.807 invite skipped: wvp_video_handoff
10:32:06.815 invite skipped: wvp_video_handoff
10:32:06.895 invite skipped: wvp_video_handoff
10:32:06.931 invite skipped: wvp_video_handoff
10:32:08.347 wvp video handoff start
10:32:08.610 invite skipped: wvp_video_handoff
10:32:08.619 invite skipped: wvp_video_handoff
10:32:09.605 stop-video from dashboard
remainingViewers: 0
10:32:13.637 wvp video handoff hard-stop
```

A second attempt:

```text
10:32:16.141 invite skipped: wvp_video_handoff
10:32:17.594 wvp video handoff start
10:32:22.557 stop-video from dashboard
remainingViewers: 0
10:32:26.588 wvp video handoff hard-stop
```

This proves:

1. The pin starts WVP.
2. WVP returns a successful handoff start.
3. The same pending pin path can issue repeated forced starts before decode.
4. The dashboard later emits an explicit Ops `stop-video`.
5. The sole viewer is lost and WVP is torn down.

It does **not** prove which exact browser callsite emits the final stop. That still needs client-side tracing or a stop reason.

---

## Missed layer 1 — duplicate forced starts happen before playOnMapPopup

`playMapPinVideoIfPopupOpen()` contains:

```text
if opts.forceLive
and isStreamInvited(camId)
and !isCameraLive(camId)
    requestStreamForCam(camId, true, opts)
```

During WVP startup:

- `streamingCams` already contains the camera, so `isStreamInvited` is true.
- WVP has not proven/decode-marked the wall yet, so `isCameraLive` is false.
- Every repeated popup lifecycle invocation forces another backend start.

The function performs this forced request **before** it checks:

- wall player ownership
- WVP attach-in-flight
- pending wall slot
- existing WVP FLV URL

Therefore the new branch inside `playOnMapPopup()` is too low in the call stack to stop duplicate pending starts.

---

## Why one click invokes the function repeatedly

Classic Fleet popup lifecycle calls the same pin play function from more than one existing route:

1. marker `popupopen`
2. `afterMarkerPopupReady`
3. repair/sync callbacks in the existing popup lifecycle

At least two current routes call:

```text
playMapPinVideoIfPopupOpen(camId, 0, { forceLive: true })
```

This was survivable with classic Fleet INVITE/player dedupe. Under asynchronous WVP handoff, the camera remains “invited but not decoded,” so the force condition remains true during the pending interval.

Do not redesign or remove the Leaflet handlers. The media adapter must make repeated classic calls idempotent.

---

## Missed layer 2 — assignCamToSlot is canvas-centric on re-entry

`attachWvpHandoffFlvToWallSlot()` correctly registers a WVP player:

```text
players.set(slotKey, handle)
activeStreams.set(slotKey, camId)
registerActivePlayer(camId, "wall", handle, handle.video || null)
```

But `registerActivePlayer()` stores its fourth argument in a field named:

```text
canvas
```

On later `assignCamToSlot()` re-entry, the registered wall player is validated like this:

```text
regCanvas = wallReg.canvas || wallReg.player.canvas
canvasInDom = regCanvas && document.body.contains(regCanvas)

if !canvasInDom:
    wallReg.player.destroy()
    clearRegisteredActivePlayer(...)
    players.delete(slotIndex)
```

For a WVP handle:

- the actual media is `<video>`
- `player.canvas` may not exist
- if the registered media field is absent/stale or the handle is still attaching, canvas-centric validation can classify the WVP player as detached
- re-entry can destroy/delete the legitimate wall FLV owner

There is an existing `handoffPlayerAttaching()` protection in `destroyPlayer()`, but this `assignCamToSlot()` registry block bypasses `destroyPlayer()` and directly destroys `wallReg.player`.

That is a concrete WVP incompatibility in the existing re-entry path.

---

## Missed layer 3 — pending ownership alone is insufficient

The previous adapter preserved:

```text
pendingWallSlots[slot] = camId
```

That protects popup cleanup only while the pending claim remains recognizable.

It does not prevent:

- repeated forced `start-video`
- repeated `assignCamToSlot`
- direct destruction of a registered WVP player during re-entry
- another lifecycle path explicitly stopping the slot/stream

So “pending ownership preserved” was necessary but not sufficient.

---

## Exact final stop — current uncertainty

Server proof:

```text
stop-video from dashboard
surface: ops
remainingViewers: 0
```

Potential emitters in `video-wall.js` include:

- `releaseServerStreamIfIdle`
- wall `stopSlot`
- Stop All
- other lifecycle cleanup paths

The server event currently carries no client reason/callsite. Do not state as fact that popup close alone caused it.

Google/next agent should identify the precise stop source using one of:

1. browser breakpoint on `emitOpsStopVideo`
2. temporary diagnostic `console.trace` in `emitOpsStopVideo`
3. temporary reason argument propagated only to logs

Do not modify behavior while collecting this proof.

---

## Correct next repair boundary for Google

Do not add another player or another pin click handler.

### A. Make classic repeated pin requests idempotent during WVP pending

In `playMapPinVideoIfPopupOpen()`:

When WVP is active and the camera already has any of:

- `isStreamInvited(camId)`
- matching `pendingWallSlots`
- matching `wvpHandoffSlotInflight`
- `wvpHandoffFlvReady(camId)`
- matching wall player/active stream

then:

- do not call `requestStreamForCam(camId, true)` again
- keep “Live streaming...”
- retain the existing wall assignment
- allow existing `video-stream-ready/onProven` to finish

Do not alter Leaflet callbacks.

### B. Make wall player registry media-element aware

In `assignCamToSlot()`:

- recognize registered WVP `<video>` media, not only canvas
- if the matching WVP handle is attaching, preserve it
- if `players.get(slotIndex)` and `activeStreams.get(slotIndex)` already match `camId`, do not destroy/reassign
- use existing handoff attaching/live checks
- do not alter slot reservation selection

A safe validation concept is:

```text
registered media =
    wallReg.canvas
    OR wallReg.player.canvas
    OR wallReg.player.video
```

and separately preserve a matching attaching handoff handle.

### C. Prove the stop emitter

Before any broader lifecycle change, identify which existing callsite emits the 10:32 stop.

Only change that path if it is incorrectly releasing a pending/matching WVP wall owner.

---

## Strict do-not-touch

- No `public/index.html` Leaflet handler changes
- No docking/layout algorithm changes
- No new FLV player
- No direct pin FLV player
- No `lib/pttServer.js`
- No Call/SIP routing
- No SOS/cold PTT changes
- No wall-slot selection/reservation redesign
- No hardcoded camera IDs

---

## Revised PASS test

With empty wall:

1. Click one pin once.
2. Exactly one logical WVP start remains active while pending.
3. Repeated classic popup callbacks do not force restart.
4. Matching WVP wall handle is not destroyed on assign re-entry.
5. Wall reaches FLV `onProven`.
6. `syncMapPopupPlayer(camId)` runs.
7. Pin mirrors the wall `<video>`.
8. No dashboard `stop-video`.
9. Viewer count remains above zero.
10. No Panel Play/Open All workaround.

---

## Accountability

The previous adapter fixed only the bottom `playOnMapPopup()` fallback.

It missed:

1. the higher `playMapPinVideoIfPopupOpen()` forced-retry branch
2. WVP-incompatible canvas validation inside `assignCamToSlot()`
3. proof of the exact final stop emitter

That is why the apparently correct “suppress pin JSMpeg” change still failed end to end.
