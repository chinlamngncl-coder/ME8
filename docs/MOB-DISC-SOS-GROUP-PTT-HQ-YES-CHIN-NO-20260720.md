# MOB-DISC — SOS group PTT targets both, but Chin does not hear

**Date:** 2026-07-20  
**Status:** DISC only — **no code** until named APPLY  
**Operator report:** When SOS team PTT is active, holding group PTT should let one BWC talk to **all** team members. Right now HQ participates, but **Chin does not hear group PTT audio**.

---

## Direct answer

This is **not** the old “PTT accidentally became call/intercom” bug, and it is **not** the SOS team collapsing to HQ-only in the UI.

The current logs prove:

1. SOS team push went to **both** BWC cams
2. The actual hold became **group PTT** with **both cam IDs**
3. Both cams had valid `:29201` sessions with correct GB IDs
4. There were **no** `talk frame dropped` errors

So the break is **after server fanout**: team selection is correct, but **one device is not playing the downlink audio** even though Fleet believes it sent it.

---

## Log proof — current run

### SOS team button really built a 2-unit team

From `storage/fleet.log` around `17:26`:

- `sos ptt team (banner)` → `teamSize:2`, `pushed:2`
- `group config sent` for `34020000001329000009`
- `group config sent` for `34020000001329000008`

That means the SOS team MESSAGE was sent to **both** kk and Chin.

### The hold really became group PTT

Immediately after the SOS team push:

- `operator talk start | {"camIds":["34020000001329000009","34020000001329000008"],"group":true}`

This is the key proof. The active talk target on hold was **both cams**, not HQ-only and not a single BWC.

### Both cams had correct PTT identities

Earlier in the same run:

- Chin: `login ok` → `camId:"34020000001329000008"`
- kk: `login ok` → `camId:"34020000001329000009"`
- both seeded `cmd:130`, `legacy:false`

So this is **not** the earlier Chin ghost-ID bug.

### No server-side send failure seen

In this window there are **no**:

- `talk frame dropped`
- `call audio tx dropped`
- `talk blocked`

So Fleet believes it had valid sockets and wrote frames successfully.

---

## Code proof — HQ is not the media target

### UI group-talk selection

`public/js/video-wall.js` resolves the SOS team and uses it for hold PTT:

```637:647:public/js/video-wall.js
function resolvePttTalkCamIds(camId) {
    // ...
    const sosTeam = global.activeSosPttTeam;
    if (Array.isArray(sosTeam) && sosTeam.length > 1 && sosTeam.indexOf(id) >= 0) {
        return sosTeam.map(String).filter(Boolean);
    }
    return [id];
}
```

Then `beginPttTalk()` emits `ptt-start` with the whole team:

```998:1010:public/js/video-wall.js
const camIds = ... resolvePttTalkCamIds(camId);
if (camIds.length > 1) {
    socket.emit('ptt-start', { camIds: camIds });
} else {
    socket.emit('ptt-start', { camId: camId });
}
```

### Server fanout

Server stores the online targets and sends `ptt-audio` to **each** target:

```10075:10093:server.js
pttTalkTargetsBySocket.set(socket.id, online);
log.ptt.info('operator talk start', { camIds: online, group: online.length > 1 });
// ...
camIds.forEach((camId) => {
    const loud = amplifyAlaw(buf, 1.5);
    if (!pttServer.sendPttAudioToDevice(camId, loud)) {
        log.ptt.warn('talk frame dropped', { camId, bytes: loud.length });
    }
});
```

### What HQ means in SOS team

`lib/sosResponseTeam.js` always appends HQ as a **group member record** in the XML:

```17:37:lib/sosResponseTeam.js
const HQ_PTT_DEVICE = { id: 'HQ', sn: '10A01000822E82BFC00', ... };
// ...
if (!devices.some((d) => d.sn === HQ_PTT_DEVICE.sn)) {
    devices.push({ ...HQ_PTT_DEVICE, id: String(devices.length + 1) });
}
```

That HQ row is part of the **group config payload**. It is **not** what `ptt-start` uses as the media target list. The actual media targets are still the BWC cam IDs from `pttTalkTargetsBySocket`.

So “I can only call on HQ” is **not** because Fleet replaced Chin with HQ in the talk fanout.

---

## What likely failed

Given the evidence, the likely failure is one of these:

1. **Device-side group playout asymmetry**
   One BWC accepts the team config and opens `:29201`, but does not actually play desk downlink while SOS/group mode is active.

2. **Team XML membership semantics on firmware**
   The BWC may treat group membership / speaker target differently when alarm unit + helper + HQ are present. HQ may be treated as the active sink while one BWC is not.

3. **Existing live/SOS state on the alarm cam**
   The alarm unit may stay in a transmit / alert / receive mode that prevents normal downlink speaker playout even though PTT TCP stays online.

4. **Server lacks per-target TX proof**
   `sendPttAudioToDevice()` returns boolean only. Right now we do not log bytes per target during group talk, so Fleet cannot prove whether both device sockets are receiving steady writes.

---

## Important distinction

This is **not** a team-selection bug.

What is already proven good:

- SOS button created team of **2**
- both devices got group config
- hold PTT started as `group:true`
- both BWC IDs were in the target list

What remains unproven:

- whether both devices **actually play** the same downlink frames after the server writes them

---

## Best next APPLYs

### 1. `MOB-APPLY-GROUP-PTT-PER-TARGET-TX-PROOF-V1`

Add temporary log proof during `group:true`:

- target cam IDs
- bytes written per target
- write failures / socket state
- maybe one log every N frames, not every frame

Goal: prove whether Fleet is sending to both `…008` and `…009` continuously during one hold.

### 2. `MOB-APPLY-SOS-GROUP-PTT-ONE-CAM-ISOLATION-V1`

Paper or tiny scoped probe to compare:

- SOS team push with alarm cam + helper
- ordinary dispatch group push with same two cams
- whether failure only happens in **SOS team mode** and not plain group mode

Goal: separate **SOS semantics** from generic group PTT.

### 3. `MOB-APPLY-GROUP-PTT-DOWNLINK-CMD-PROOF-V1`

Instrument current `resolveDownlinkAudioCmd(sess)` and target writes during group talk to make sure both sessions stay on expected `cmd:130`.

---

## One-line conclusion

The SOS group PTT path is already targeting **both** kk and Chin correctly; the current failure is downstream of selection and looks like **one-device downlink playout under SOS/group state**, not HQ replacing Chin in the Fleet fanout.
