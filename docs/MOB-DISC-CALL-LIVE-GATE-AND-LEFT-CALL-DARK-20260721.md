# MOB DISC — Call alert + left Call dark (baseline function, WVP migration missing)

**Date:** 2026-07-21 ~10:04  
**Status:** DISC only — no code change  
**Operator evidence:** Browser alert: **“Start live video before calling”**. The Call control beside PTT on the left also does not light/enable.

---

## Verdict

These are two related gates, not a missing Call design:

| Symptom | Actual gate |
|---|---|
| Pin/wall Call produces “Start live video before calling” | Server receives `start-bwc-call`, but checks only the classic Fleet `liveStreamPool`; WVP Live is not counted |
| Left Call/Voice control stays dark | Client enables it only when live/PTT readiness is recognized; WVP video state and/or PTT readiness is not reflected in that button state |

**Call already exists in Fleet/baseline. Do not redesign it.** The missing work is the previously documented WVP live-state adapter.

---

## Log proof from this exact test

At ~10:04:

- `start-bwc-call` reached the server twice for Chin (`audioOnly:false`)
- Chin PTT connected and logged in successfully on TCP `29201`, `gtid 49`
- kk also connected and logged in on `29201`
- WVP handoff group refresh ran

Therefore:

1. The click handler works.
2. The server receives Call.
3. TCP 29201 was online at that moment.
4. The failure occurs **before** the PTT Call branch, at the server’s classic live-video gate.

---

## Smoking gun

Current `server.js`:

```js
if (!dashboardVideo.isStreamingForCam(camId)) {
    emitBwcCallState(camId, false, 'Start live video before calling');
    return;
}
```

`dashboardVideo.isStreamingForCam()` points to the classic `liveStreamPool`.

Under WVP handoff:

```text
BWC → WVP startPlay → ZLM FLV → <video.me8-zlm-primary>
```

There is no Fleet pool stream, so the gate says “not live” even when the WVP picture is live.

This is why the alert is exact and repeatable.

---

## Baseline truth (important distinction)

Classic baseline also contains the live-before-Call gate. It worked because classic video **was** a Fleet pool stream.

So migration does **not** mean blindly byte-copying this backend predicate. It means preserving the baseline product rule:

> Call is enabled when the selected BWC is genuinely live.

The WVP anti-corruption adapter must translate “genuinely live” to:

```text
Fleet pool live
OR active WVP/ZLM handoff viewer/live state
```

That is migration of the baseline contract, not a new Call invention.

---

## This had already been solved/documented

Existing applied records:

- `MOB-APPLIED-FIX-CALL-ON-ZLM-LIVE-20260719.md`
- `MOB-APPLIED-ZLM-WATCH-REGISTER-CALL-PTT-WVP-20260719.md`

They explicitly implemented:

- durable ZLM/WVP live watch
- `isLiveForVoiceCall`
- Call gate accepting Fleet streaming **or** ZLM/WVP watch/live viewers
- PTT Call when 29201 is online
- SIP voice fallback where applicable

Current `server.js` no longer uses `isLiveForVoiceCall`; it reverted to pool-only `dashboardVideo.isStreamingForCam`.

**This is a regression/lost migration, not unfinished product design.**

---

## Why the left Call control is dark

There are two existing Fleet controls:

1. **Live pin/wall Call**
   - client checks `isLiveCamId`
   - server then applies the pool-only live gate and rejects WVP live

2. **Fleet-row Voice/Call beside PTT**
   - uses `audioOnly:true`
   - client readiness depends on online + `pttOnlineDevices`
   - at 10:04 the backend log shows Chin and kk logged into 29201, so if the button stays dark, the client readiness state is not being refreshed/painted correctly

Do not add a third Call button or new Call stack. Restore the existing baseline controls’ WVP state translation.

---

## Correct migration scope (when explicitly APPLYed later)

Restore the already-applied WVP Call migration:

1. Reinstate one `isLiveForVoiceCall(camId)` adapter:
   - Fleet pool streaming, **or**
   - active WVP handoff/live viewer for that cam.
2. Use it at the existing `startBwcVoiceCall` gate.
3. Preserve existing baseline `toggleVoiceCall`, `start-bwc-call`, Call UI and audit path.
4. Refresh the existing left Fleet Call/Voice button when `ptt-device-state` / WVP live state changes.
5. Keep 29201 and SIP fallback behavior already documented.

### Do not

- invent a new Call protocol
- add another Call button
- couple Call to a second FLV player
- rewrite pin layout
- hardcode Chin or kk

---

## Pass bar

With WVP picture live:

1. Pin/wall Call does not show “Start live video before calling”.
2. Existing Call connects using the baseline Fleet voice path.
3. Existing left Call/Voice button reflects readiness and activates.
4. Video remains live during Call where the baseline contract requires it.

---

## Bottom line

**Call is not missing. WVP live is invisible to the classic backend Call gate.**  
The exact WVP Call migration was already documented and previously applied, then lost/reverted. Restore that adapter; do not redo Call.
