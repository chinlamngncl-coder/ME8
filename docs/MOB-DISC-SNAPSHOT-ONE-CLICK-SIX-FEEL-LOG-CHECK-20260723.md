# MOB-DISC — Snapshot “6 times” (agent counted fleet.log)

**Date:** 2026-07-23  
**Status:** PAPER — log-checked. **No Snapshot code APPLY yet** (dashboard is not multi-firing).  
**Also:** Centre Summary — operator confirmed **back / PASS**.

---

## Centre Summary

**PASS** (operator). Queue no longer blocked by Centre load.  
Default map fix when you want it: `MOB-APPLY WVP-PRESENCE-REPLAY-GPS-ON-ONLINE-V1`.

---

## What you reported

One click **Snapshot** on the dashboard → BWC feels like it takes a picture **~6 times**. You do not want to try Record until this is understood.

You are not wrong to fear a storm. We **checked the log** (not a guess).

---

## Log evidence (agent, `storage/fleet.log`)

| Fact | Value |
|------|--------|
| Log file | `storage/fleet.log` (active; ~393 MB; updating) |
| **Today `TakePicture` / `device control sent` count** | **1** |
| That line | `2026-07-23 01:04:18.009 +08:00 [SIP] INFO device control sent \| {"device":"34020000001329000009","recordCmd":"TakePicture"}` |
| Other TakePicture recently | 2026-07-22 22:39 cam `…008`; 2026-07-22 20:38 cam `…009`; 2026-07-17 cam `…008` — **one line each**, not bursts of 6 |

**Verdict for this click:** Fleet/dashboard sent **exactly one** SIP DeviceControl `TakePicture` to cam `…009`.  
There is **no** 6× `device control sent` / TakePicture multi-emit in the server log for that action.

So this is **not** (on current evidence) “one click → six dashboard emits.”  
A blind `SNAPSHOT-SINGLE-EMIT-V1` that only debounce-clicks the button would **not** match what the log shows.

---

## What the code path is (one emit)

1. Map toolbar → `requestSnapshot()` → `socket.emit('remote-control', 'TakePicture')` (`public/index.html`).  
2. Server `socket.on('remote-control')` → one `deviceControl.sendDeviceControl(…, recordCmd: 'TakePicture')` (`server.js`).  
3. SIP MESSAGE XML with `<RecordCmd>TakePicture</RecordCmd>` once (`lib/deviceControl.js`).

FR live “snaps” for Analytics are **ffmpeg grabs from the live stream** (`lib/frLiveProbe.js`) — they do **not** send `TakePicture` to the BWC. That path can flood the **Recent rail**, but it should **not** make the bodycam shutter 6 times from a Snapshot button.

---

## What might still cause “6 times” on the BWC (most likely first)

| Hypothesis | Fits log? | Notes |
|------------|-----------|--------|
| **A. Device burst / continuous / multi-shot mode** | Yes | One `TakePicture` → firmware writes N JPEGs or fires shutter N times. **6** can be a camera setting (burst count), not ME8. |
| **B. Device UI / gallery refresh** | Yes | One file + UI redraw / shutter animation / SD write noise feels like many. |
| **C. Dashboard multi-bind (6 emits)** | **No** for this event | Would show **6×** `device control sent` — we see **1×**. |
| **D. FR poller TakePicture** | **No** | Poller uses stream JPEG grab, not DeviceControl TakePicture. |
| **E. Six cams selected** | Unlikely | Command uses **toolbar target cam**; log shows **one** device id `…009`. |

**Agent pick (risk):** Treat as **device-side response to one legal command** until a future click shows **N>1** in `fleet.log`. Do not invent dashboard debounce as the “fix.”

---

## What we still need from you (ops — short)

When you can stand one more test:

1. Prefer **Fleet already running** (log is hot).  
2. Note the time, click **Snapshot once** on the same BWC.  
3. Say: `SNAPSHOT OPS: clicked once on <name/id> at <time>.`  
4. Agent re-counts `TakePicture` in that window.  

If still **1×** in log but BWC still “6 shots” → next is **device/settings disc** (burst count on BWC), not Fleet emit patch.  
If log shows **N≥2** → then named APPLY e.g. `SNAPSHOT-SINGLE-EMIT-V1` (find double listeners / retries).

Optional on device (you or tech): open BWC photo/burst settings — look for continuous / burst / interval shoot = 6.

---

## Recommended next MOB (product queue)

| Priority | Item | Why |
|----------|------|-----|
| **1 (map)** | `MOB-APPLY WVP-PRESENCE-REPLAY-GPS-ON-ONLINE-V1` | Centre PASS; Lock→Unlock pin/GPS still the locked default map fix |
| **Snapshot** | **No code APPLY yet** | Log = 1× TakePicture; need device-burst confirm or a click that shows N>1 |
| Record | **Do not test Record** until Snapshot story is closed or you accept risk | Your call on timing |

---

## Agent must not

- Blame you for clicking six times  
- APPLY a Snapshot “debounce” without log N>1  
- Claim FR poller sends TakePicture without evidence  
- Skip the log and invent

---

## One-line summary

**You clicked once; Fleet sent one TakePicture (`…009` @ 01:04:18). The six shutter feel is almost certainly on the BWC (burst/UI), not six ME8 commands — until a future log proves otherwise.**
