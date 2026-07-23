# MOB DISC — One remote click → BWC fires many (Record / Snapshot)

**Date:** 2026-07-23  
**Status:** PAPER — log-checked again after operator report. **No remote-control code APPLY yet.**  
**Related:** `MOB-DISC-SNAPSHOT-ONE-CLICK-SIX-FEEL-LOG-CHECK-20260723.md` (Snapshot-only; this disc covers **all** map remotes).

---

## What you reported

Every remote you click **once** on the dashboard (Snapshot, Start/Stop SD record, etc.) feels like the **BWC does it many times** — record / stop / record / stop, or many snapshots.  
You said it **did not happen last time**. You suspect WVP / SIP.

---

## What the log actually shows (agent checked `storage/fleet.log`)

### Tonight — every `device control sent` on 2026-07-23

| Time (+08) | Cam | Command | Count |
|------------|-----|---------|-------|
| 01:04:18 | `…009` | `TakePicture` | **1** |
| 01:16:33 | `…008` | `Record` | **1** |
| 01:16:41 | `…008` | `StopRecord` | **1** |

**There is no burst of 6× `TakePicture` or Record/StopRecord storms in Fleet’s “device control sent” lines.**

Around the Record click, WVP ACL only logs **keepalives → heartbeat** (`backend-acl-translator-v1`) — **not** DeviceControl. Presence/GPS replay does **not** send Record/TakePicture.

### Code path (one emit per click)

1. Toolbar → `socket.emit('remote-control', cmd)` (`public/index.html`).  
2. `socket.on('remote-control')` → **one** `deviceControl.sendDeviceControl` (`server.js`).  
3. **One** SIP `MESSAGE` with `<RecordCmd>…</RecordCmd>` (`lib/deviceControl.js`) — log line fires **once per send call**.

So this is **not** “dashboard / Socket.IO multi-bind firing N commands” on current evidence. A blind **debounce-the-button** APPLY would **not** match the log.

---

## Important lab fact (why WVP can still be involved)

`getContactUriForCam` prefers **WVP-homed LAN contact** when video handoff is on (`lib/fleetPttContact.js` → `wvp_register_peer`).  
DeviceControl MESSAGE goes to the **camera LAN SIP URI**, not “through WVP UI.”  

That means:

| Hypothesis | Fits “1× log, many× BWC”? | Notes |
|------------|---------------------------|--------|
| **A. Dashboard multi-emit** | **No** | Would show N× `device control sent` |
| **B. WVP presence / ACL keepalive** | **No** | Keepalive ≠ RecordCmd |
| **C. SIP MESSAGE retransmit** (no/late 200 OK) | **Possible** | One `sip.send` can UDP-retransmit; some firmwares re-run RecordCmd per copy. **Not logged today** as separate “sent” lines |
| **D. BWC firmware / burst / record mode** | **Possible** | One legal command → many shutter/LED cycles |
| **E. Live INVITE/BYE churn feels like record** | Possible | Separate from SD RecordCmd; check if live was open |
| **F. You clicked Start then Stop** | Fits 01:16 | Log shows Record @ :33 then StopRecord @ :41 (~8s) — two toolbar events |

**Agent pick (risk):** Do **not** invent multi-emit debounce. Next product step is **prove the wire**: did the camera get 1 MESSAGE or many retransmits / duplicate Call-Ids?

---

## Recommended next APPLY (one)

**`DEVICE-CONTROL-SIP-ACK-TRACE-V1`**

- Log DeviceControl **Call-Id**, contact URI/source (`wvp_register_peer` vs fleet cache), and whether a **200** arrives (or timeout/retransmit).  
- Operator: one Snapshot + one Record click with times.  
- Then we know: **wire storm** vs **device behavior**.

**Do not** turn off `FM_WVP_VIDEO_HANDOFF` to “fix” remotes.  
**Do not** park WVP.

Optional later (only if ACK trace shows 1 clean MESSAGE and BWC still multi-fires): BWC settings disc (burst / continuous record).

---

## Phrase when ready

**`MOB-APPLY DEVICE-CONTROL-SIP-ACK-TRACE-V1`** — **APPLIED** 2026-07-23 (`MOB-APPLIED-DEVICE-CONTROL-SIP-ACK-TRACE-V1-20260723.md`).

Until then: disc only (plus any unrelated APPLY you already named).

---

## Operator (no tech)

1. Restart Fleet.  
2. Ctrl+F5.  
3. Click Snapshot (or Record) **once**; note the time.  
4. Tell us the time — we read `device control sent` / `ack` / `ack timeout` in `fleet.log`.
