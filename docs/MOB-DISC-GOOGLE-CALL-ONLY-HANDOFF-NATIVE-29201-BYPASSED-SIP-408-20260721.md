# MOB DISC — Google/next-agent Call-only handoff: native 29201 bypassed, SIP Talk failed 408

**Date:** 2026-07-21 ~10:27  
**Status:** Call FAIL — DISC only, no product code change  
**Requested reviewer:** Google or next AI  
**Do not trust prior PASS wording. Verify this independently from code and logs.**

---

## User-visible failure

1. Operator starts Live.
2. BWC/video indicator lights.
3. Operator presses existing Call.
4. No two-way audio.

The BWC/video light is not proof of a connected audio Call.

---

## What the previous fix changed

Applied:

`RESTORE-WVP-CALL-LIVE-GATE-V1`

It changed only:

1. `server.js`
   - added `isLiveForVoiceCall(camId)`
   - accepts classic Fleet pool live, or active WVP handoff plus dashboard viewer
   - existing Call gate now uses this predicate

2. `public/js/video-wall.js`
   - calls `syncFleetVoiceRows()` when `ptt-device-state` changes

3. `public/index.html`
   - cache-busted `video-wall.js`

It did **not** repair the subsequent audio-routing decision.

---

## Exact latest runtime result

Both BWCs were registered on native Fleet PTT before the Call:

```text
PTT listening: 192.168.1.38:29201
gtid: 49
login ok
user: UB-6A5G
```

The Call attempt then logged:

```text
voice call outbound-intercom
profile: talk-duplex
invite sending
mode: audio
transport: udp
```

The BWC did not answer:

```text
talk invite retry
transport: tcp
status: 408
```

Final state:

```text
voice intercom telemetry
phase: invite-failed
message: Voice call failed (408)
callstate: "0"
audio: "0"
```

There was no:

```text
voice call via ptt
```

Therefore no Call session existed and no audio could flow.

---

## Root cause to verify

### Client routing

File:

`public/js/video-wall.js`

Function:

`toggleVoiceCall(camId, opts)`

Current routing:

```text
voicePath = fleetVoicePathForCam(camId)

if voicePath === "outbound-intercom":
    emit "start-intercom"
    return

emit "start-bwc-call"
```

This profile branch occurs before the normal native live-Call route.

### Why these devices select outbound intercom

File:

`lib/bwcVoiceProfile.js`

`resolveFleetVoicePath()` defaults UB model/login prefixes to:

```text
outbound-intercom
```

Both lab devices report:

```text
UB-6A5G
```

So the existing Call control can bypass `startBwcVoiceCall()` and send a SIP Talk INVITE.

### Native branch that was bypassed

File:

`server.js`

Function:

`startBwcVoiceCall(payload, socket)`

Its non-audio-only live branch already checks:

```text
isLiveForVoiceCall(camId)
PTT_ENABLED
pttServer.isDevicePttOnline(camId)
```

Then it logs:

```text
voice call via ptt
preserveVideo: true
```

That is the branch the latest Call never used.

---

## Locked architecture

Reference:

`docs/MOB-ARCH-CANCEL-VOICE-LOBOTOMY-RESTORE-NATIVE-PTT-20260720.md`

Product transport law:

```text
WVP/ZLM = video
Fleet TCP 29201 = BWC PTT and Call audio
gtid = 49
HDA_NET_DATA / dwCMD 130 = native device protocol
```

WVP must not become the Call audio transport.

Do not invent a third Call stack.

---

## Required repair for independent review

Proposed isolated MOB:

`RESTORE-NATIVE-29201-LIVE-CALL-ROUTING-V1`

### Live Call path must be

```text
existing live Call button
→ start-bwc-call, audioOnly false
→ isLiveForVoiceCall
→ pttServer.isDevicePttOnline
→ voice call via ptt
→ existing CallMic / call-audio
→ Fleet TCP 29201
→ preserve WVP video
```

### Routing rule

When the target BWC is live and online on native 29201:

- do not allow UB `outbound-intercom` profile selection to bypass native Call
- do not emit `start-intercom`
- use the existing `start-bwc-call` native branch

### Fleet-row Call beside PTT

The user also requires the existing left Fleet-row Call button.

Google/next agent must independently verify its intended baseline contract:

- If it is native audio-only Call while no video is required, it should still prefer online 29201.
- It must not silently select SIP Talk only because `audioOnly === true`.
- Preserve the difference between Call and hold-to-talk PTT at the UI/state level, but reuse the established native transport.

Do not add another button.

---

## Files to inspect

### Client

`public/js/video-wall.js`

- `isLiveCamId`
- `fleetVoicePathForCam`
- `toggleVoiceCall`
- `onBwcCallState`
- `onBwcCallRx`
- `syncFleetVoiceRows`
- CallMic / `call-audio` emit path

### Server

`server.js`

- `isLiveForVoiceCall`
- `startBwcVoiceCall`
- `launchOutboundTalkCall`
- `launchFleetVoiceBroadcast`
- `start-intercom` socket handler
- `start-bwc-call` socket handler
- `call-audio` socket handler

### Policy/transport

- `lib/bwcVoiceProfile.js`
- `lib/pttServer.js` — inspect only; do not rewrite packet framing
- `lib/mediaSession.js`
- `lib/psG711Audio.js` — locked; do not edit without explicit authorization

### Baseline/reference

- `baseline/2026-07-18-classic-pass/public/js/video-wall.js`
- relevant server baseline if present
- `docs/MOB-ARCH-CANCEL-VOICE-LOBOTOMY-RESTORE-NATIVE-PTT-20260720.md`
- `docs/MOB-DISC-CALL-LIVE-GATE-PASSED-BUT-AUDIO-MISROUTED-SIP-408-20260721.md`

---

## Strict boundaries

Do not:

- put audio through WVP
- change TCP 29201 packet framing
- change gtid 49
- rewrite PTT login/group config
- add a Call button
- add an audio player
- couple Call repair to pin layout repair
- treat SIP 408 as a microphone/browser permission issue
- claim PASS before an audio session connects

---

## PASS test

1. Confirm selected BWC logs `PTT login ok` on 29201.
2. Start WVP Live.
3. Press existing live Call.
4. Server logs `voice call via ptt`.
5. Server does not log `voice call outbound-intercom`.
6. No SIP UDP/TCP retry and no 408.
7. Desk microphone reaches BWC speaker.
8. BWC microphone reaches desk.
9. WVP video stays live during Call.
10. End Call.
11. Normal PTT remains usable afterward.
12. Repeat using the left Fleet-row Call control and verify its intended native behavior.

---

## Previous-agent accountability

The previous agent fixed the predicate:

```text
Is this camera live under WVP?
```

but failed to verify the next decision:

```text
Which audio transport did Call actually select?
```

That omission caused a partial fix to be presented before end-to-end audio proof.

---

## Bottom line

The latest Call did not fail because WVP Live was rejected. It failed because the UB voice profile bypassed the existing native Call branch, sent SIP Talk INVITEs, received no answer, and ended with 408.

The next agent should restore the existing live Call control to native Fleet TCP 29201 while preserving WVP video and all established PTT transport behavior.
