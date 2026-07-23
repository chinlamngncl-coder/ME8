# MOB DISC — FAILED: PIN-FIRST-PENDING-REPAIR-AND-TRACE-V1 → BWC called non-stop

**Date:** 2026-07-21 ~10:48–10:56 (+08)  
**Status:** **OPERATOR FAIL**  
**Audience:** Google / next architect  
**Scope:** DISC only — **no further product code in this doc**  
**Log pack:** `docs/LOG-PACK-PIN-PENDING-REPAIR-FAIL-BWC-CALL-STORM-20260721.txt`  
**Source log:** `storage/fleet.log` (lab LAN `192.168.1.38`)

---

## Verdict (one line)

`MOB-EXECUTE-PIN-FIRST-PENDING-REPAIR-AND-TRACE-V1` did **not** stabilize pin-first. After apply + refresh, the dashboard still **spam-fires `start-video`**, which retriggers **SIP fast DeviceStatus polls every 2s** and WVP **startPlay → Busy Here / timeout → hard-stop → retry**. Operator sees the **BWC being called non-stop**. Concurrent Voice Call path still dies with **SIP 408**.

---

## What the agent was ordered to do

Subject: `MOB-EXECUTE-PIN-FIRST-PENDING-REPAIR-AND-TRACE-V1`

Three exact repairs in `public/js/video-wall.js` only:

| Layer | Intent |
|-------|--------|
| 1 | `playMapPinVideoIfPopupOpen()` idempotent under WVP — if claim exists (`isStreamInvited` / `pendingWallSlots` / `wvpHandoffSlotInflight` / `wvpHandoffFlvReady`), **do not** `requestStreamForCam(camId, true)` again |
| 2 | `assignCamToSlot()` media-aware — treat `wallReg.player.video` as registered media; do not destroy/reassign matching WVP handle |
| 3 | Temporary `console.trace()` inside `emitOpsStopVideo` to find premature `stop-video` callsite |

**Strict constraints from order:** do not touch Call/SIP; do not touch Leaflet/`index.html`; do not add pin FLV player.

---

## What the agent actually changed

File touched: **`public/js/video-wall.js` only** (for this MOB).

1. **`wvpPinHasPendingOrActiveClaim(camId)`**  
   Returns true when WVP UI is on and cam is invited / FLV-ready / wall `activeStreams` / `pendingWallSlots` / `wvpHandoffSlotInflight`.

2. **`playMapPinVideoIfPopupOpen()`**  
   - If pending claim + `forceLive`, strips `forceLive` into `pinPlayOpts`.  
   - Skips forced `requestStreamForCam(..., true)` when claim exists.  
   - Passes `pinPlayOpts` into slot / `playOnMapPopup` paths.

3. **`playOnMapPopup()`**  
   Under WVP, `forceLive` no longer becomes `forceInvite` on `assignCamToSlot` (`forceWallInvite = forceLive && !wvpVideoHandoffUi`).

4. **`assignCamToSlot()`**  
   Early-return if slot already has player/`activeStreams` for cam, or handoff attaching with slot claim; registered media = canvas **or** `player.video`.

5. **`emitOpsStopVideo()`**  
   Added:
   ```js
   console.trace('[me8-stop-video-trace]', { camId, surface: OPS_VIEWER_SURFACE });
   ```

**Not in this MOB (but still in tree from earlier Call MOB):**  
`RESTORE-TRUE-SIP-AUDIO-CALL-UNLOCKED-V1` already forced Call → `outbound-intercom` / `talk-duplex`. Logs below still show that path failing 408 — **do not confuse with pin video storm**, but both hammer the same BWC.

---

## Operator symptom

- Pin / live attempts still fail to hold a stable picture.  
- **BWC keeps being called non-stop** (status / play / busy).  
- Voice Call still fails.

---

## Log proof (fleet.log)

### A) Window counts (10:48–10:55 pack)

From `LOG-PACK-PIN-PENDING-REPAIR-FAIL-BWC-CALL-STORM-20260721.txt`:

| Event | Count |
|-------|------:|
| `fast status poll started` (reason=`start-video`) | **53** |
| `invite skipped` (`wvp_video_handoff`) | **45** |
| `wvp video handoff start` | **14** |
| `wvp video handoff startPlay fail` | **10** |
| `Busy Here` | **13** |
| `stop-video from dashboard` | **13** |
| `hard-stop` | **14** |
| `voice call outbound-intercom` | **3** |
| `Voice call failed (408)` | **4** |
| `dashboard connected` | **3** |

Separate sample **10:50–10:56**: Chin (`…00008`) alone had **434** `device status query sent` lines — driven by repeated `fast status poll started` with `intervalMs:2000`, `windowMs:180000`, `reason:"start-video"`.

### B) Start/stop storm (example 10:48:21–10:48:31)

One ~10s slice: **many** `fast status poll started` + `invite skipped` for Chin/kk, then dashboard `stop-video` → soft-stop → `startPlay fail` / `hard-stop`.

```text
10:48:21.332 fast status poll started | camId …00008 | reason start-video | intervalMs 2000
10:48:21.340 invite skipped | reason wvp_video_handoff | camId …00008 | surface ops
… (same cam, many repeats within 1–2s) …
10:48:27.478 stop-video from dashboard | camId …00008 | remainingViewers 0
10:48:28.194–10:48:29.620  again: fast status poll + invite skipped storm
10:48:30.671 stop-video from dashboard | camId …00008 | remainingViewers 0
10:48:31.371 wvp video handoff startPlay fail | wvp_stream_timeout
10:48:31.382 wvp video handoff hard-stop
```

### C) Busy Here loop while Voice Call also holding the device (10:52:56–10:53:28)

```text
10:52:56.071 voice call outbound-intercom | camId …00008 | profile talk-duplex
10:52:56.076 invite sending | mode audio | transport tcp | audioOnly true | hasVideoMline false
10:53:13.870 fast status poll started | reason start-video | …00008
10:53:13.929 wvp video handoff startPlay fail | "Busy Here"
10:53:13.965 hard-stop
10:53:14–10:53:22  repeated startPlay fail Busy Here / hard-stop / invite skipped
10:53:21.256 stop-video from dashboard | remainingViewers 0
10:53:25.559 wvp video handoff start | flvHost 192.168.1.38:18088
10:53:28.083 voice intercom telemetry | invite-failed | Voice call failed (408)
```

**Reading:** dashboard still emits **ops `start-video`** while an audio SIP INVITE is outstanding → WVP play returns **Busy Here** → client/server retry storm → Call times out **408**. BWC is hit from **two stacks at once** (video handoff + voice INVITE) plus DeviceStatus fast poll.

### D) Earlier same morning (pre-/post-adapter) still shows same class of fail

```text
10:48:11.747 voice intercom telemetry | …00008 | invite-failed | Voice call failed (408)
10:48:32.243 voice call outbound-intercom | …00009 | talk-duplex
10:49:04.262 voice intercom telemetry | …00009 | invite-failed | Voice call failed (408)
```

---

## Why Layer 1 did not stop the storm (agent diagnosis for Google)

Idempotence was added **only** around the early `forceLive && isStreamInvited && !isCameraLive` branch. It does **not** block:

1. **`playOnMapPopup()` → `requestStreamForCam(camId, !!opts.forceLive)`** still runs on the first (and any re-entry) path that reaches `playOnMapPopup` with a cleared/stripped force flag but still needs a stream.  
2. **Popup open / retry timers** (`playMapPinVideoIfPopupOpen` attempt loops every 100ms) re-enter while wall is not yet “live”, so another path can emit `start-video` again.  
3. Each server `start-video` restarts **`fast status poll`** (`intervalMs:2000`, `windowMs:180000`) → operator-visible **non-stop DeviceStatus calling** of the BWC even when Fleet INVITE is skipped for WVP.  
4. Client still emits **`stop-video`** (`remainingViewers:0`) — Layer 3 only added `console.trace`; browser console was not captured into `fleet.log`, so **stop callsite still unproven in server log**.  
5. WVP **Busy Here** + hard-stop + client re-start creates a **second storm** on top of the first.

So: pending claim guard was **too narrow**; the **emitOpsStartVideo / requestStreamForCam** surface still multi-fires; DeviceStatus poll is a **side effect amplifier**.

---

## What is NOT the fix (locked product rules)

- Do **not** turn off `FM_WVP_VIDEO_HANDOFF`.  
- Do **not** park WVP / restore classic ffmpeg as “the fix”.  
- Do **not** invent a third pin player.  
- Do **not** bundle Call + pin + dock into one creative patch.  
- Operator is not tech: next MOB must be **one named APPLY**, with verify in `fleet.log`.

---

## Questions for Google (please answer with one ordered MOB)

1. **Single owner for pin-first start:** Where should the **only** allowed `start-video` emit live under WVP (which function), and what server-side or client-side lock must reject duplicates for ~N seconds / until FLV proven / until hard-stop?

2. **Fast status poll:** Should `fast status poll started` on every `start-video` be **deduped** or disabled under WVP handoff? It is currently the clearest “BWC called non-stop” amplifier (`intervalMs:2000` × many starts).

3. **Busy Here:** When Voice Call (`talk-duplex` audio SIP) is in flight, should video handoff **refuse** `startPlay` (and client must not retry), or must Call wait until video is idle? Log proves both run together → Busy Here + 408.

4. **stop-video:** Server only sees `stop-video from dashboard` with `remainingViewers:0`. Layer 3 `console.trace` is client-only. What is the correct **server-visible stop reason** or required client log export so we stop guessing?

5. **Call 408:** Pure audio INVITE still 408 after `RESTORE-TRUE-SIP-AUDIO-CALL-UNLOCKED-V1`. Is SDP/`m=audio 0` / private HDA TCP wrong, or is WVP SIP stack / device busy from video the real cause? Recommend **one** Call MOB only after video start spam is dead.

---

## Recommended next step (agent pick — one MOB)

**`MOB-APPLY PIN-WVP-SINGLE-START-LOCK-AND-STOP-STATUS-POLL-SPAM-V1`** (name illustrative — Google may rename):

1. **One logical start** per cam: client + server reject duplicate ops `start-video` while handoff pending/live.  
2. **Do not restart** DeviceStatus fast poll on every duplicate start.  
3. Keep stop-trace; add a **reason string** on `stop-video` payload so fleet.log shows callsite class.  
4. **Do not** change Call/SIP in the same MOB.

Only after that PASS: separate Call MOB for 408 / Busy Here interaction.

---

## Attachments for Google

| File | Purpose |
|------|---------|
| `docs/LOG-PACK-PIN-PENDING-REPAIR-FAIL-BWC-CALL-STORM-20260721.txt` | Filtered 10:48–10:55 evidence |
| `storage/fleet.log` | Full lab log (huge) |
| `public/js/video-wall.js` | Uncommitted pending-repair + prior pin/Call UI edits |
| Prior disc | `docs/MOB-DISC-GOOGLE-POST-ADAPTER-PIN-FIRST-FAIL-DUPLICATE-FORCE-AND-CANVAS-REENTRY-20260721.md` |

---

## Plain English for operator

We tried to stop the pin from starting live many times. It still starts/stops too much. The log shows the phone being **status-polled every 2 seconds** and **video play hammered until Busy**, while Call also fails with timeout. **No new code** until Google answers and you type one exact `MOB-APPLY …`.
