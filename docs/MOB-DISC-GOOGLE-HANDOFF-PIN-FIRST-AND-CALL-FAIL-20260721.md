# MOB DISC — Google handoff: pin-first and Call remain FAIL after incomplete Fleet/WVP migration

**Date:** 2026-07-21 ~10:24  
**Status:** HANDOFF / DISC only — no product code change in this document  
**Product law:** Preserve classic Fleet/Gold behavior. WVP/ZLM replaces video transport/paint only. Native Fleet TCP 29201 remains BWC PTT/Call audio.

---

## 1. Executive truth

Two user-visible functions remain failed:

1. **Pin-first video**
   - Wall Idle → click pin only → does not reliably produce stable pin video/layout.
   - Panel Play or Open All first → WVP wall video exists → pin mirror works.
   - Panel-first is a workaround, not PASS.

2. **Call audio**
   - WVP Live can be visible and the BWC/video indicator can light.
   - Pressing Call produces no audio.
   - Latest attempt was routed to SIP Talk intercom, timed out with SIP 408, and never established a Call.

The earlier claim “baseline restored + WVP inserted” was incomplete.

---

## 2. What the previous agent actually changed

### A. Pin work

Applied attempts, in order:

1. `PIN-CLICK-POPUP-OPEN-NO-DOCK-STORM-V1`
   - Changed Leaflet popup/dock handling.
   - Failed; pin still jumped/failed.

2. `PIN-MIRROR-USE-WALL-VIDEO-SOURCE-V1`
   - Changed pin mirror source from wall canvas-only to:
     - classic wall `<canvas>`, or
     - WVP `<video.me8-zlm-primary>`.
   - This part works **only after** a WVP wall source exists.

3. `PIN-MIRROR-CACHEBUST-AND-PROVE-LOG-V1`
   - Cache-busted `video-wall.js`.
   - Added runtime mirror proof logging.

4. `PIN-CLICK-STARTS-WALL-THEN-MIRROR-DYNAMIC`
   - Added WVP-specific pin-first helpers/branches.
   - Failed with pin jump/top-left/no picture.

5. `PIN-FLEET-BASELINE-PLAYER-ONLY-CLEANUP-V1`
   - Removed the new pin-first helper branches.
   - Restored classic-pass versions of:
     - `playOnMapPopup`
     - `focusMapPinQuiet`
     - `toggleVoiceCall`
     - Leaflet click/popup patterns
   - Kept:
     - WVP wall FLV player
     - wall `<video>` as pin mirror source
     - `onProven → syncMapPopupPlayer(camId)`
   - This cleanup is now **confirmed FAIL** for pin-first bootstrap.

### B. Call work

Applied `RESTORE-WVP-CALL-LIVE-GATE-V1`:

- Added server `isLiveForVoiceCall(camId)`:
  - classic Fleet pool live, or
  - active WVP handoff with dashboard viewer ref.
- Replaced the server’s pool-only live gate with that adapter.
- Repainted Fleet Call readiness on `ptt-device-state`.
- Did not edit `lib/pttServer.js` or PTT packet framing.

Result:

- The old “Start live video before calling” gate can now pass.
- Actual Call audio still fails because the request is routed to SIP outbound intercom instead of native Fleet 29201.

---

## 3. Current code facts — pin

Primary file:

`public/js/video-wall.js`

### WVP wall attach already exists

`attachWvpHandoffFlvToWallSlot()`:

- creates the WVP FLV `<video.me8-zlm-primary>`
- stores the handle in `players`
- stores `activeStreams.set(slotKey, camId)`
- on FLV proof:
  - marks wall Live
  - calls `syncMapPopupPlayer(camId)` after 120ms

This is the correct single WVP player. Do not add another FLV player to the pin.

### Pin mirror from WVP video already exists

`wallMirrorSourceForCam(camId)` returns:

```text
{ kind: "canvas", el: wallCanvas }
```

or:

```text
{ kind: "video", el: video.me8-zlm-primary }
```

`startMapMirrorFromWall()` uses `videoWidth/videoHeight` for video and paints into one pin mirror canvas by RAF.

This works after the wall source exists.

### Exact remaining dead bootstrap

Current `playOnMapPopup()`:

1. calls `requestStreamForCam(camId)`
2. reserves a wall slot
3. calls existing `assignCamToSlot(...)`
4. then unconditionally creates:

```text
canvas.map-pin-video-canvas
```

5. then calls:

```text
attachCanvasPlayer(canvas, "map", camId, null)
```

That is the classic JSMpeg pin bootstrap.

Classic Fleet path:

```text
Fleet SIP INVITE → MPEG-TS/JSMpeg → pin canvas
```

Current WVP path:

```text
WVP startPlay → ZLM FLV → wall <video>
```

Therefore the direct pin canvas is dead under WVP. It cannot decode the WVP FLV handoff.

### Capability signal is emitted but discarded

`server.js` emits:

```text
server-capabilities.wvpVideoHandoff
```

But current `onServerCapabilities()` in `video-wall.js` does **not** store that property.

The previous cleanup explicitly removed `wvpVideoHandoffUi` while the server still contains a comment saying the client uses it to suppress pin JSMpeg.

This is an internally inconsistent cleanup:

```text
server announces WVP mode
→ client discards announcement
→ playOnMapPopup cannot select WVP-safe pending behavior
→ classic pin JSMpeg fallback remains active
```

---

## 4. Runtime proof — pin

Latest logs prove pin click is not simply ignored:

- `10:14:56–10:14:59`
  - `start-video`
  - `invite skipped`, reason `wvp_video_handoff`
  - `wvp video handoff start`
- `10:15:14–10:15:15`
  - another direct WVP handoff start

The session later emits:

- Ops `stop-video`
- viewer counts become zero
- WVP soft-stop
- WVP hard-stop

Confirmed conclusions:

1. Pin-first reaches the backend.
2. WVP `startPlay` occurs.
3. The problem is frontend pending/ownership/player transition, not a missing backend click event.
4. Panel/Open All succeeds because it establishes a persistent wall slot/player/layout before pin mirroring begins.

Not yet proven:

- The exact frontend caller which causes the final zero-viewer `stop-video`.

The server log records the stop and viewer count but does not identify the browser callsite. Do not pretend this last callsite is proven. Instrument or trace `emitOpsStopVideo` / `releaseServerStreamIfIdle` / popup close only if required.

---

## 5. Correct pin-first repair

This must be one migration adapter, not another Leaflet redesign.

### Keep unchanged

- Classic Leaflet marker click/open behavior
- existing dock/fit/layout algorithms
- existing wall-slot reservation
- existing `requestStreamForCam`
- existing `assignCamToSlot`
- existing WVP wall FLV player
- existing `onProven`
- existing WVP wall-video → pin RAF mirror
- non-WVP classic/JSMpeg behavior

### Required behavior under `wvpVideoHandoff === true`

In the existing `playOnMapPopup()` bootstrap:

1. Keep `requestStreamForCam(camId)`.
2. Keep wall slot reservation and `assignCamToSlot`.
3. Keep the popup in existing “Live streaming…” pending state.
4. **Do not create or attach `map-pin-video-canvas` JSMpeg.**
5. Preserve a stable wall/viewer claim while WVP is pending.
6. Existing `video-stream-ready` attaches FLV to the bound wall slot.
7. Existing `onProven` calls `syncMapPopupPlayer(camId)`.
8. Existing `attachMapPopupPlayer()` finds `wallMirrorSourceForCam(camId)` and starts the mirror.
9. Popup close/remount/dock work must not release the sole viewer while handoff is pending.

### Minimal mode plumbing

Store the already-emitted capability:

```text
wvpVideoHandoffUi = !!data.wvpVideoHandoff
```

Use it only at the media fallback boundary. Do not use it to redesign click/layout.

### Important ownership check

Before declaring PASS, prove that:

- `pendingWallSlots[slot] === camId` remains true until WVP player ownership is installed, or
- `players/activeStreams` already owns the cam.

Then prove `cleanupMapPinPlayerOnPopupClose()` cannot call `releaseServerStreamIfIdle()` during that transition.

### Pin PASS test

1. Wall completely Idle.
2. Hard refresh.
3. Click one pin only.
4. No Panel Play.
5. No Open All.
6. Wall starts WVP FLV.
7. Pin mirrors it automatically.
8. Popup remains in classic intended position/layout.
9. No top-left jump.
10. No zero-viewer stop during startup.

---

## 6. Current code facts — Call

### Backend WVP live gate now exists

`server.js`:

```text
isLiveForVoiceCall(camId)
```

accepts:

- classic pool stream, or
- WVP handoff active + dashboard viewer.

This repaired only the live predicate.

### Native Fleet Call branch already exists

`startBwcVoiceCall()` non-audio-only branch checks:

- live gate
- `PTT_ENABLED`
- `pttServer.isDevicePttOnline(camId)`

Then logs:

```text
voice call via ptt
preserveVideo: true
```

and marks Call active. Browser microphone audio then uses existing Fleet Call/PTT transport.

### Exact routing scar

Current client `toggleVoiceCall()` does this before normal `start-bwc-call`:

```text
voicePath = fleetVoicePathForCam(camId)
if voicePath === "outbound-intercom"
    emit "start-intercom"
else
    emit "start-bwc-call"
```

`lib/bwcVoiceProfile.js` defaults UB-class model hints to:

```text
outbound-intercom
```

Both lab devices report model/login hint `UB-6A5G`.

Therefore the live Call control can bypass `startBwcVoiceCall()` entirely and enter SIP Talk.

---

## 7. Runtime proof — Call

Latest attempt:

- both devices had native Fleet PTT login:
  - port `29201`
  - `gtid 49`
  - `login ok`
- Call then logged:
  - `voice call outbound-intercom`
  - profile `talk-duplex`
  - SIP audio INVITE over UDP
  - TCP retry after 408
  - final `Voice call failed (408)`
- device telemetry stayed:
  - `callstate: "0"`
  - `audio: "0"`
- no successful:
  - `voice call via ptt`

Conclusion:

The Call click reached the audio stack. The BWC/video light was not a connected Call. Audio was routed to SIP Talk, the device did not answer, and no session existed.

---

## 8. Correct Call repair

Locked architecture:

```text
WVP/ZLM = video only
Fleet TCP 29201 / HDA_NET_DATA / dwCMD 130 = BWC PTT and Call audio
```

Reference:

`docs/MOB-ARCH-CANCEL-VOICE-LOBOTOMY-RESTORE-NATIVE-PTT-20260720.md`

### Required live Call behavior

```text
live Call control
→ start-bwc-call with audioOnly false
→ isLiveForVoiceCall
→ pttServer.isDevicePttOnline
→ voice call via ptt
→ existing call-audio / CallMic
→ preserve WVP video
```

### Required routing correction

For a live BWC Call, do not allow the UB `outbound-intercom` profile to bypass the native branch.

The profile/SIP path must not override:

- an active WVP/Fleet live BWC Call, or
- an online native 29201 Call target.

If Fleet-row audio-only Call is also intended to work without video, route it through the existing native 29201 Call path when the device is online. Do not force SIP merely because `audioOnly === true`.

### Keep unchanged

- `lib/pttServer.js`
- TCP packet framing
- dwCMD 130
- gtid 49
- group XML/contact registration
- PTT hold/talk behavior
- WVP video handoff

### Call PASS test

1. Confirm device logged in on 29201.
2. Start WVP Live.
3. Press existing live Call.
4. Log must show `voice call via ptt`.
5. Log must not show `voice call outbound-intercom`.
6. No SIP 408.
7. Desk microphone reaches BWC.
8. BWC audio reaches desk.
9. WVP video remains live.
10. End Call restores normal PTT readiness.

---

## 9. Repair order — do not bundle

### First

`RESTORE-FLEET-PIN-FIRST-WVP-ADAPTER-V1`

Scope only:

- store WVP capability
- suppress dead pin JSMpeg only under WVP
- preserve existing wall ownership until FLV proof
- converge on existing mirror
- prove direct pin-first layout/video

Operator must PASS pin-first before the next item.

### Second

`RESTORE-NATIVE-29201-LIVE-CALL-ROUTING-V1`

Scope only:

- prevent live Call from entering UB outbound SIP profile
- use existing `start-bwc-call` native 29201 branch
- preserve video
- test two-way Call and normal PTT after Call

Do not modify both in one APPLY.

---

## 10. Files Google should inspect

### Pin

- `public/js/video-wall.js`
  - `onServerCapabilities`
  - `playOnMapPopup`
  - `playMapPinVideoIfPopupOpen`
  - `attachWvpHandoffFlvToWallSlot`
  - `attachWvpHandoffFlvForCam`
  - `attachMapPopupPlayer`
  - `wallMirrorSourceForCam`
  - `startMapMirrorFromWall`
  - `releaseServerStreamIfIdle`
  - `opsWallClaimsCam`
  - `cleanupMapPinPlayerOnPopupClose`
- `public/index.html`
  - classic marker click/popup lifecycle
- `server.js`
  - `server-capabilities`
  - `start-video`
  - WVP handoff ready event
- `lib/wvpVideoHandoff.js`
- `lib/liveViewers.js`

### Call

- `public/js/video-wall.js`
  - `isLiveCamId`
  - `toggleVoiceCall`
  - `onBwcCallState`
  - `syncFleetVoiceRows`
- `server.js`
  - `isLiveForVoiceCall`
  - `startBwcVoiceCall`
  - `launchOutboundTalkCall`
- `lib/bwcVoiceProfile.js`
- `lib/pttServer.js` — inspect only; do not rewrite transport
- `lib/mediaSession.js` / existing Call audio session implementation

### Known-good comparison

- `baseline/2026-07-18-classic-pass/public/js/video-wall.js`
- `baseline/2026-07-18-classic-pass/public/index.html`
- Firmware Gold lock:
  - `BASELINE-ME8-FIRMWARE-GOLD.md`
  - `baseline/2026-07-06-me8-firmware-gold/**` is read-only

---

## 11. Relevant evidence documents

- `MOB-DISC-PIN-CLEANUP-FAILED-BASELINE-BOOTSTRAP-NOT-WVP-MIGRATED-20260721.md`
- `MOB-APPLIED-PIN-FLEET-BASELINE-PLAYER-ONLY-CLEANUP-V1-20260721.md`
- `MOB-DISC-CALL-LIVE-GATE-AND-LEFT-CALL-DARK-20260721.md`
- `MOB-APPLIED-RESTORE-WVP-CALL-LIVE-GATE-V1-20260721.md`
- `MOB-DISC-CALL-LIVE-GATE-PASSED-BUT-AUDIO-MISROUTED-SIP-408-20260721.md`
- `MOB-ARCH-CANCEL-VOICE-LOBOTOMY-RESTORE-NATIVE-PTT-20260720.md`

---

## 12. Repository warning

The working tree contains many unrelated modified/untracked files and many prior WVP MOBs.

Do not treat the whole `git diff` as one clean patch from this pin/Call work.

Do not commit, reset, restore, or overwrite unrelated work. Compare named functions and named baselines surgically.

---

## 13. Accountability

The previous work made two incorrect completion judgments:

1. Restoring classic pin functions was treated as restoring pin-first, while the classic JSMpeg bootstrap remained incompatible with WVP.
2. Restoring the Call live gate was treated as restoring Call, while client voice-profile routing still bypassed native 29201 and selected failing SIP Talk.

These were partial migrations, not completed restoration.

---

## Bottom line for Google

Do not invent a new pin, player, layout, Call stack, or voice protocol.

Finish two missing anti-corruption boundaries:

1. **Pin:** translate classic “pin requests live” into the existing WVP wall-owner/pending/FLV-proof path, suppressing only the dead JSMpeg pin fallback under WVP.
2. **Call:** translate existing live Call into the native Fleet 29201 branch, preventing UB SIP outbound-intercom profile selection from overriding the online BWC Call path.

Everything else stays Fleet/Gold.
