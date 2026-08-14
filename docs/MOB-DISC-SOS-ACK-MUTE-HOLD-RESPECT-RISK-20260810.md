# MOB DISC — Honest risk: SOS-ACK-MUTE-HOLD-RESPECT-V2 — 2026-08-10

**Status:** RISK ONLY. **No Ack-mute code this turn.**  
**Read:** `.cursorrules` · Firmware Gold · DeviceControl once · you asked not to destroy live again.

Operator: middot APPLY done separately. Before any Ack-mute V2 APPLY — read this.

---

## What is already true (V1)

`dashboard-boot.js` already delays **`muteAckedCamLiveAudio`** by **60s** after Ack.  
That alone is **low risk** (timer around one call).

You still see **mute on Ack** because something **else** mutes sooner — most likely **pin/live resync after SOS clear** → `defaultAudioMutedForNewStream` when cam is **no longer** SOS → default **muted**.

---

## What V2 would have to touch (honest)

To “stay unmuted 60s after Ack,” something must **override default mute after SOS ends**. Options:

| Option | Touch | Risk to live / SOS video |
|--------|-------|---------------------------|
| **A — Flag only in `dashboard-boot.js`** | After Ack: set `window.__sosAckListenHoldUntil[camId]=now+60s`. After `resyncPinVideoAfterSosAck`, if hold active → call existing `VideoWall` unmute/set muted false **once**. Cancel on manual mute / timer / new SOS. | **Lowest.** No attach/detach, no FLV, no BYE, no pin mirror. Uses existing mute API. |
| **B — Change `isSosCamForAudio` / `defaultAudioMutedForNewStream` in `video-wall.js`** | Treat hold window as “SOS-like” for audio default. | **Higher.** That file is live-audio + wall path. Easy to mis-scope and affect non-SOS streams or mute toggle. **I do not recommend B** given past live damage. |
| **C — Skip `resyncPinVideoAfterSosAck` on Ack** | Avoid remount mute. | **High.** Can leave pin video stuck / out of sync. **Reject.** |

**Recommendation if you APPLY later:** **A only** — `dashboard-boot.js` (+ maybe **one export** `isCamAudioMuted` / use existing mute helpers if already public). **Do not** edit Firmware Gold pin/FLV cores. **Do not** touch stop-video / Record.

---

## What can still go wrong (even with A)

| Risk | Likelihood | If it bites |
|------|------------|-------------|
| Hold unmute fights officer who already muted | Low–med | Cancel hold on first manual mute click (must wire carefully) |
| Timer fires while new SOS open | Low | Already cancel hold on new SOS (V1) |
| Unmute call with no live → no-op / confusion | Low | Icon state only |
| Accidental edit of `video-wall.js` “while we’re here” | **Process risk** | **You forbid it** — V2 APPLY text must say `dashboard-boot.js` only |
| Live video dies | **Should be ~0 if A scoped** | If video dies, **revert V2 commit only** — middot/mute-V1 checkpoint already on remote |

---

## What V2 will **not** fix

- BWC **SD record** after stop video (that is `SOS-STOP-VIDEO-STOP-RECORD-V1`)  
- Banner encoding (middot APPLY)  
- “Audio rec: Off” on device telemetry  

---

## Honest bottom line

| Question | Answer |
|----------|--------|
| Will V2 destroy live if we only do **A**? | **Unlikely** — audio mute flag only, no stream teardown. |
| Am I “going to touch something already”? | **Yes** — the **Ack → resync → mute** path. That is why it feels scary. Scoped **A** touches **when** we set muted, not how video attaches. |
| Should you APPLY V2 tonight if you have no redo time? | **Only if** you accept a 2-minute Ack listen PASS/FAIL and keep `189b2eb` as rollback. If no redo bandwidth → **park V2**; live with mute-on-Ack until a calm window. |
| My call | Prefer **park** until after middot PASS + you have 10 min to test. When ready: exact line  
`MOB-APPLY SOS-ACK-MUTE-HOLD-RESPECT-V2 dashboard-boot-only` |

---

## Not applying V2 until you say that exact APPLY.
