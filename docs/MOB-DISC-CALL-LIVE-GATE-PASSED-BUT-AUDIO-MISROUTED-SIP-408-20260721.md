# MOB DISC — Call live gate passed, but audio was misrouted to SIP Talk and failed 408

**Date:** 2026-07-21 ~10:22  
**Status:** FAIL — DISC only, no product code change  
**Operator evidence:** Live was clicked and BWC/video lit, but no Call audio.

---

## Verdict

This is no longer the earlier **“Start live video before calling”** rejection.

The restored WVP live gate allowed the attempt to proceed. The remaining failure is the audio transport:

```text
Call click
→ outbound SIP Talk intercom
→ UDP INVITE timeout
→ TCP retry timeout
→ SIP 408
→ no connected Call and no audio
```

The request did **not** use the restored native Fleet TCP 29201 Call/PTT path.

---

## Exact log proof

For Chin (`...000008`) and kk (`...000009`) at ~10:18–10:20:

- `voice call outbound-intercom`
- profile: `talk-duplex`
- `invite sending`, mode `audio`, transport `udp`
- `talk invite retry`, transport `tcp`, status `408`
- `voice intercom telemetry`, phase `invite-failed`
- final message: `Voice call failed (408)`

The device status stayed:

```text
callstate: "0"
audio: "0"
```

There is no successful:

```text
voice call via ptt
```

Therefore:

1. The button/click reached the Call stack.
2. The earlier WVP live gate was not the final blocker in this attempt.
3. No audio session connected.
4. The BWC/video light is not proof that Call audio connected.

---

## PTT evidence

Both devices successfully logged into native Fleet PTT before the attempt:

```text
port: 29201
gtid: 49
login ok
```

But the Call path selected SIP `outbound-intercom` instead of using that online native channel.

The logs also show 29201 disconnects around the SIP Call attempts. That confirms this was not a healthy native Fleet Call session.

---

## Why it selected the wrong path

Current client `toggleVoiceCall()` resolves a per-device `voicePath` before sending the normal Call event:

```text
UB model profile
→ outbound-intercom
→ start-intercom
```

`lib/bwcVoiceProfile.js` defaults UB-class devices to `outbound-intercom`.

That decision bypasses the normal live Call branch in `startBwcVoiceCall()` which would log:

```text
voice call via ptt
preserveVideo: true
```

So restoring `isLiveForVoiceCall()` fixed only the old gate. It did not remove this transport misrouting.

---

## Baseline/product contract

The locked voice architecture from:

`MOB-ARCH-CANCEL-VOICE-LOBOTOMY-RESTORE-NATIVE-PTT-20260720.md`

states:

- WVP/ZLM = video
- Fleet TCP 29201 = BWC Call/PTT audio
- `gtid 49`
- UI stays on Fleet `start-bwc-call` / `call-audio`
- WVP must not carry or replace this private audio protocol

That is the path the latest attempt did not take.

---

## Status correction

`RESTORE-WVP-CALL-LIVE-GATE-V1` is only a **partial result**:

| Part | Result |
|---|---|
| WVP live accepted by backend gate | Yes |
| Existing Call control reaches backend | Yes |
| Call audio uses native Fleet 29201 | **No** |
| SIP Talk connects | **No — 408** |
| Two-way audio | **No** |

Call remains **FAIL**.

---

## Correct restoration boundary

This is not a new Call design.

The existing live Call control must remain on the baseline native path:

```text
live Call
→ start-bwc-call
→ verify WVP/Fleet live
→ verify device online on 29201
→ voice call via ptt
→ call-audio over Fleet TCP
→ preserve WVP video
```

The Fleet-row audio-only control and any genuine SIP intercom profile must not silently override the live BWC Call path.

---

## Do not do

- Do not put voice into WVP.
- Do not add another Call button.
- Do not invent another audio protocol.
- Do not blame the microphone before a Call session connects.
- Do not accept BWC/video light as Call PASS.
- Do not disturb PTT packet framing or TCP 29201.

---

## Bottom line

**The live gate fix worked, but Call still failed because the UI/profile routed the attempt into SIP Talk. The BWC never answered that INVITE, both UDP and TCP timed out with 408, and no audio session existed. Native Fleet 29201 was online and should have remained the Call transport.**
