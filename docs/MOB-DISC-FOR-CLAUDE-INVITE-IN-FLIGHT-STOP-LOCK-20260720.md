# MOB DISC — For Claude: invite_in_flight lock + stopPlay / zlm-watch-unregister + what ME8 is doing now

**Type:** DISC only — no APPLY / no code change in this doc  
**Audience:** Claude / peer review (exact lock implementation, not architecture-only)  
**Date:** 2026-07-20  
**Lab env:** `FM_LAB_WVP=1`, `FM_SOFTOPEN_WVP_ONLY=0`, `FM_WVP_THIN_CAMS=` (empty)

---

## 1. Consolidated “what we are doing now” (night of 2026-07-19 → 20)

Split-brain lab: **picture on WVP/ZLM (:5060)** vs **classic Fleet SIP/PTT (:5062 / :29201)**.

| Done (APPLIED) | Intent |
|----------------|--------|
| WVP webhook adapter `lib/wvpWebhooks.js` | Inbound Alarm / ptt-rx before dashboard JWT; IP whitelist; → `sos-alarm` / `ptt-rx-state` |
| Revert global `isPublicPath` weaken | Core auth stays; only adapter is session-free |
| GB28181 translation bridge (outbound) | `ptt-start` → WVP audio broadcast (Fleet TCP still if online) |
| ZLM watch → ops-live | Frontend emits `zlm-watch-active`; Call/PTT live-gate cleared without Fleet video INVITE |
| **`MOB-APPLY-FLEET-INVITE-LOBOTOMY`** (just now) | Hard-skip Fleet **video** INVITE for WVP-lab BWCs; stop must not wait on `invite_in_flight` |

| Still dead (operator) | Note |
|------------------------|------|
| Cold PTT, cold SOS, pin-video PTT | Not fixed by invite lobotomy — voice marriage still open genre |
| Live picture | Works (WVP/ZLM) |

**Observed race (pre-lobotomy log ~23:51):**  
`start-video` → Fleet `invite requested` → `zlm-watch-active` → ACK SOS → `stop-video` + `zlm-watch-unregister` → **`pool stop deferred invite_in_flight`** → later `wvp stopPlay` → **`invite failed 408`**.

Root cause of INVITE despite Soft Open intent: Soft Open skip was **off** (`FM_SOFTOPEN_WVP_ONLY=0`) and thin list empty, so Fleet INVITE still fired for Chin on WVP.

---

## 2. Ports / ownership (one screen)

```
Cam REGISTER → host :5060 (wvp-sip-lan-proxy) → Docker WVP :15061
Live picture   → WVP startPlay → ZLM FLV → browser; socket zlm-watch-active on :3988
Fleet SIP      → :5062  (legacy video INVITE / classic SOS contact)  ← lobotomized for video
PTT TCP        → :29201 (cold/pin PTT PCM)  ← still often unmarried
Dashboard HTTP → :3988
```

---

## 3. Lock implementation — `invite_in_flight`

**File:** `lib/liveStreamPool.js`

### Flag

- Per-session: `session.inviteInFlightSince = Date.now()` when pool sends INVITE.
- Cleared on final SIP response (>=200 or >=300), or via new `clearInviteInFlight`.
- Window: `INVITE_IN_FLIGHT_MS` default **12000** (`FM_INVITE_IN_FLIGHT_MS`).

### Predicate (exact)

```js
// lib/liveStreamPool.js ~618-624
function isInviteInFlight(camId) {
    const session = sessions.get(camId);
    if (!session || !session.dashboardActive) return false;
    if (session.activeDialog) return true;  // ALSO true if dialog already exists!
    const since = session.inviteInFlightSince;
    return !!(since && Date.now() - since < INVITE_IN_FLIGHT_MS);
}
```

**Gap note for Claude:** `activeDialog` alone makes `isInviteInFlight` true even when not “waiting for 100 Trying”. Stop deferral uses this predicate — any session with `dashboardActive` + `activeDialog` (or fresh `inviteInFlightSince`) blocks non-force stop for up to 12s poll.

### Clear helper (post-lobotomy)

```js
// lib/liveStreamPool.js ~626-634
function clearInviteInFlight(camId) {
    const session = sessions.get(camId);
    if (!session) return false;
    session.inviteInFlightSince = 0;  // does NOT clear activeDialog
    return true;
}
```

**Gap note:** Clear only zeroes `inviteInFlightSince`. If `activeDialog` is set, `isInviteInFlight` remains **true** until `stopStreamForCam` / `endSessionCall` deletes the session. Lobotomy path still falls through into `stopStreamForCam` immediately after clear — that should clear dialog. Deferral path was the bug (never reached `stopPlay` for up to 12s).

---

## 4. Stop path — `stop-video` / `zlm-watch-unregister` → deferral → `stopPlay`

### 4a. Socket handlers (`server.js`)

**Pseudocode (actual call order):**

```
socket.on('stop-video', payload):
  camId = parse(payload)
  liveViewers.removeView(socket, camId, surface)
  releaseCamStreamWhenUnwatched(camId)   // ← only if remaining viewers == 0 inside

socket.on('zlm-watch-unregister', payload):
  liveViewers.removeView(...)
  zlmLiveWatchRemove(socket, camId)      // durable ZLM ops-live set
  releaseCamStreamWhenUnwatched(camId)   // same teardown funnel
```

Exact unregister (~9979–9992):

```js
socket.on('zlm-watch-unregister', (payload) => {
    const camId = ...;
    const remaining = liveViewers.removeView(socket.id, camId, surface);
    const zlmWatchers = zlmLiveWatchRemove(socket.id, camId);
    log.media.info('zlm-watch-unregister', { camId, remainingViewers: remaining, zlmWatchers });
    releaseCamStreamWhenUnwatched(camId);
});
```

Exact stop-video (~10003–10031): removeView → `releaseCamStreamWhenUnwatched(camId)`.

**Dual emit gap:** Operator Stop often fires **both** `stop-video` and `zlm-watch-unregister` → `releaseCamStreamWhenUnwatched` twice. Second hit returns early via `stopVideoInProgress` Set or `liveViewers.countForCam > 0` already 0. First call is the one that may hit deferral.

### 4b. Teardown funnel — `releaseCamStreamWhenUnwatched` (THE LOCK)

**File:** `server.js` ~9501–9556  

**Pre-lobotomy logic (what caused the gap):**

```
if (!force && isInviteInFlight(camId) && !isStreaming):
    log "pool stop deferred" invite_in_flight
    poll every 250ms up to 12s:
      if viewers>0: abort
      if !inFlight: recurse release
      if deadline: release with force=true
    return          // ← stopPlay NOT called until poll exits
// else fall through...
stopVideoInProgress.add
liveMediaAdapter.onPoolStop
Promise.all([ liveStreamPool.stopStreamForCam, stopWvpSoftOpenBridge ])  // stopPlay here
```

**Post-lobotomy (current):**

```
if !force && shouldLobotomizeFleetVideoInvite(camId) && inFlight && !streaming:
    clearInviteInFlight(camId)
    log "pool stop immediate" wvp_lobotomy_bypass_invite_lock
    // fall through — NO return
else if !force && inFlight && !streaming:
    // classic deferral poll (non-WVP / opt-out path only)
    return poll...
// then always:
Promise.all([ stopStreamForCam, stopWvpSoftOpenBridge ])  // WVP /api/play/stop
```

### 4c. `stopPlay` bridge

```js
// server.js stopWvpSoftOpenBridge ~9464
function stopWvpSoftOpenBridge(camId) {
    if (FM_LAB_WVP !== '1') return skipped;
    log 'wvp stopPlay on operator stop'
    return wvpLabClient.stopPlay(id, id)   // WVP REST /api/play/stop
}
```

Called **only after** deferral returns / is bypassed — not from `zlm-watch-unregister` directly.

---

## 5. Invite path that armed the lock (pre-lobotomy)

```
start-video → startMediaFromDashboard
  → (old) no Soft Open skip because FM_SOFTOPEN_WVP_ONLY=0
  → liveStreamPool.sendInviteWithFallback
  → session.inviteInFlightSince = now
  → log "invite requested" / "pool invite sending"
  → SIP INVITE to Fleet contact on :5062 → hang → 408 ~12s later
```

**Post-lobotomy early return (~8719–8738):**

```js
if (mode === 'video' && shouldLobotomizeFleetVideoInvite(camId, payload)) {
    log invite skipped reason=wvp_fleet_invite_lobotomy
    emit video-stream-ready { invite:false, wvpFleetInviteLobotomy:true }
    return;  // never sets inviteInFlightSince
}
```

Also SOS server pull short-circuits the same way.

`shouldLobotomizeFleetVideoInvite`: `FM_LAB_WVP=1` + BWC id → **true** (lab-wide), unless `forceFleetInvite` or `FM_ALLOW_FLEET_INVITE_WITH_WVP=1`.

---

## 6. Sequence diagrams

### Bad race (logged 23:51 — before lobotomy)

```
UI start-video ──► Fleet INVITE (inFlight=true)
UI zlm-watch-active ──► opsLive (parallel picture OK)
UI stop-video ──► releaseCam… ──► DEFER (wait inFlight)
UI zlm-watch-unregister ──► releaseCam… ──► DEFER / stopVideoInProgress
… ~6–12s …
Fleet 408 clears inFlight OR force deadline
──► stopStreamForCam + stopPlay
```

### Intended after lobotomy

```
UI start-video ──► skip INVITE (lobotomy) ──► video-stream-ready invite:false
UI zlm-watch-active ──► opsLive
UI stop-video / unregister ──► releaseCam… ──► immediate clear + stopPlay
(no 408 wait)
```

---

## 7. Gaps still plausible for Claude to poke

1. **`clearInviteInFlight` does not clear `activeDialog`** — if a dialog somehow exists, `isInviteInFlight` stays true; lobotomy branch only runs when lobotomy predicate true, then falls through to `stopStreamForCam` which should destroy session. Classic (non-lobotomy) path still defers.

2. **Double teardown** (`stop-video` + `zlm-watch-unregister`) — second call may no-op; first must succeed.

3. **Lobotomy does not fix cold SOS/PTT** — only removes Fleet **video** INVITE fight / stop lock.

4. **`isInviteInFlight` true when `activeDialog` set** — naming is broader than “INVITE transaction in flight”; can surprise stop logic for real Fleet live sessions (by design deferral).

5. **Frontend not changed** — UI still sends `start-video` then ZLM watch; server now no-ops Fleet INVITE.

---

## 8. Key file map for Claude

| File | Symbols |
|------|---------|
| `server.js` | `shouldLobotomizeFleetVideoInvite`, `startMediaFromDashboard`, `releaseCamStreamWhenUnwatched`, `stopWvpSoftOpenBridge`, `stop-video`, `zlm-watch-unregister`, `zlm-watch-active` |
| `lib/liveStreamPool.js` | `isInviteInFlight`, `clearInviteInFlight`, `sendInviteWithFallback`, `stopStreamForCam`, `INVITE_IN_FLIGHT_MS` |
| `lib/wvpWebhooks.js` | Inbound Alarm/PTT RX adapter (separate from this lock) |
| `docs/MOB-APPLIED-FLEET-INVITE-LOBOTOMY-20260720.md` | APPLY record |
| `docs/MOB-DISC-LIVE-OK-COLD-PTT-SOS-DEAD-20260719.md` | Operator matrix |

---

## 9. One-line for Claude

The gap was not “stopPlay missing from unregister” — unregister already calls the same `releaseCamStreamWhenUnwatched` as `stop-video`; the gap was that function **returning early for up to 12s while `isInviteInFlight`**, delaying `stopWvpSoftOpenBridge` / `stopPlay`, because a legacy Fleet INVITE had been started during live/SOS. Lobotomy removes that INVITE for WVP-lab BWCs and bypasses the deferral for those cams.

**No code change in this DISC.**
