# MOB DISC — Google messaging (WS :6000 / dwCMD 76) vs our Fleet chat · why HQ→BWC fails

**Date:** 2026-07-23  
**Status:** DISC only — **no APPLY**  
**Ask:** Google §9 style guide for BWC WebSocket messaging (broadcast + auto-reply). We already have Messages UI / protocol — still cannot get HQ text onto the BWC. Counter-check our build vs Google.  
**Evidence:** `storage/fleet.log` Messaging channel (sample window) shows **only** `websocket listening` — **no** `msgWss bound` / `device connected` / `message queued` recently.

---

## Plain English (verdict)

Google’s description matches **what we already built** in spirit: persistent WS on **`:6000`**, binary **`dwCMD = 76`**, chunked payload, ack **77**, HQ UI → server → device socket.

Your HQ Messages panel **does** emit `send-message` and the server **does** know how to queue cmd-76 packets — **but delivery only works if that BWC already holds an open WS session in `activeCameraSockets`**.

Tonight’s log pattern says the weak link is almost certainly **step 1 (BWC never logs into `ws://…:6000/login?user=…`)**, not “we forgot Google’s broadcast structure.” Until `msgWss bound` appears for Chin/kk, every Send is a no-op (or “asleep + SIP hint” then **return without queue/retry**).

---

## Side-by-side: Google vs ME8

| Google (SDK §9 style) | ME8 today | Match? |
|-----------------------|-----------|--------|
| `ws://IP:6000/login?user=SIP&pwd=…&type=1` | Listener `0.0.0.0:6000`; URL must include `user=<camId>`; we parse `user=`, ignore `type`/`pwd` for auth (bind by known camId) | **Partial** — port/path family OK; auth model differs |
| Persistent socket per BWC | `activeCameraSockets` Map camId → WebSocket | **Yes** |
| Login success binary | `hdaMsg.buildLoginSuccess()` (`CMD_LOGIN_RET = 2`) on connect | **Yes** |
| Broadcast / 1:1: `dwCMD = 76`, `toNum` + `toPersons[]` | `buildMsgDataPacket` + `buildOutboundChunks` → `OutboundMessageQueue` | **Yes** (HQ→device uses **send** layout PDF-16) |
| Chunk ≤ 100KB, rising `dwIndex` | `MAX_PAYLOAD_CHUNK = 100*1024` | **Yes** |
| Ack `dwCMD = 77` | `CMD_MSG_DATA_ACK`, queue waits ACK before next chunk | **Yes** |
| Device→HQ reply carries `from` (recv layout) | `parseMsgDataRecv` / reassembler → `camera-message` | **Yes** (inbound path) |
| Officer taps Reply; no IP lookup | Relies on same open WS | **Yes if socket up** |
| Pre-provision URL via ADB | We push SIP `MsgServerIP/Port/Uri` hints (`pushMsgServerHints`) + OnlineStatus roster | **Yes intent** — device must still open WS |

**HQ UI path we already have**

1. `public/js/chat-ui.js` → `socket.emit('send-message', { text, cameraId })`  
2. `server.js` `send-message` → `activeCameraSockets.get(camId)`  
3. If open → `buildOutboundChunks` → `ws.send` cmd 76  
4. If **not** open → log `Text channel asleep…`, `pushMsgServerHints`, **`return` (message discarded — no retry queue)**

---

## Why you cannot get HQ → BWC (ranked)

### 1) BWC message WebSocket never connects (most likely — log)

Recent Messaging lines are only:

```text
[Messaging] INFO websocket listening | port:6000 deviceUrl:ws://192.168.1.38:6000
```

Missing (would appear if cams logged in):

- `device connected`  
- `msgWss bound`  
- `login response sent`  
- `message queued`

**Meaning:** Fleet is listening; **no companion/vendor message client** is completing Google’s step 1 against our lab IP/port.

Typical causes on BWC (Android / vendor UI):

| Cause | What to check |
|-------|----------------|
| Message server URL wrong / empty | Must be real LAN IP (e.g. `192.168.1.38`), **not** 172.x Docker, not stale IP |
| Port not **6000** (or your `FM_MSG_WS_PORT`) | Firewall / BWC menu |
| URL missing `user=<full SIP device id>` | We **reject** connect without `user=` |
| `user=` not in BWC registry | We close `4002 unknown device` |
| Dual protocol / GB-only | Some firmwares only open message WS when **YDT / message service** enabled |
| Companion vs vendor app | Google assumes **companion** opens WS; stock ROM may never call `:6000` |
| PC firewall blocks inbound 6000 | Windows Defender inbound TCP 6000 |

### 2) Send when “asleep” drops the text (code)

```text
no open socket → hint over SIP → return
```

Even if hint wakes the cam later, **that Send is already gone**. HQ may show the line locally if something else echoes — but the wire packet was never queued. (Our code emits `camera-message` **only after** successful queue — so if asleep, dashboard should also **not** persist out… unless you saw UI-only optimism elsewhere.)

### 3) Possible layout mismatch (secondary — only after sockets bind)

Google’s **receive** side for the officer UI talks about **`tagHDA_MSG_DATA_RECV`** with a **`from`** field (reply addressing).

Our HQ→device builder uses **send layout** (`toNum` + `toPersons` = BWC ids) — correct for “platform addresses devices” in many HDA PDFs, but **some** firmwares only render inbox items if the payload looks like **recv** (`from` = HQ/platform SIP id).

**Lead:** After `msgWss bound` is proven, if packets queue (`message queued`) but BWC screen stays empty → try outbound **recv-shaped** cmd-76 (`from=SERVER_ID`) as a named MOB. Do **not** start that until connection works.

### 4) Not a WVP handoff bug

Messaging WS is **independent** of Soft Open / FLV. Video can be perfect while chat is dead if `:6000` never binds.

---

## What Google got right / wrong for *us*

| Google | Our lab |
|--------|---------|
| Right: dedicated WS message service, cmd 76/77, chunking, reply via open socket | We already implemented that stack (`lib/hdaMessageProtocol.js` + `msgWss`) |
| Right: officer UX needs open socket + `from` for reply | Reply path exists **inbound**; HQ→device needs socket first |
| Incomplete: “ADB provision URL and it just works” | Device must still **connect**; we also reject unknown `user=` |
| Incomplete: broadcast = fill all SIP accounts | We already support `toPersons[]`; broadcast = multi-recipient once sockets exist |
| Misleading if read as “build a new system” | **Do not rebuild** — diagnose **connection**, then optional layout |

---

## Operator proof checklist (no code)

1. Restart Fleet; confirm log: `websocket listening … port:6000 … ws://192.168.1.38:6000` (your Wi‑Fi IP).  
2. On BWC: message / IM / “消息服务器” URL = that exact host:port (and user = full device id if the menu asks). Enable message service if dual-protocol.  
3. Watch log for **`msgWss bound`** for that camId within ~30s of register.  
4. HQ Messages → pick that online cam → Send “test1”.  
5. Expect log: **`message queued`**. Then look at BWC screen.

| Result | Meaning |
|--------|---------|
| No `msgWss bound` | Connection / URL / firewall / YDT-message off — **not** Google broadcast packing |
| `bound` + `queued` + no UI on cam | Then investigate **recv vs send layout** MOB |
| `Text channel asleep` on every Send | Same as no bind — fix WS first |

---

## Recommended next (one path — when you want APPLY)

**Do not** rewrite messaging from Google’s essay.

1. **Ops:** Get one cam to `msgWss bound` (URL + firewall + message feature on).  
2. If still empty after `message queued`:  
   `MOB-APPLY MSG-WS-HQ-OUTBOUND-RECV-LAYOUT-V1` — build HQ→device cmd-76 as **recv** (`from=platform`) and/or queue+retry after hint instead of drop.  
3. Optional hardening:  
   `MOB-APPLY MSG-WS-SEND-RETRY-AFTER-HINT-V1` — don’t discard text when asleep.

---

## One line

**We already match Google’s WS :6000 / cmd-76 design; HQ→BWC fails because cams are not binding the message socket (log shows listen-only). Fix BWC URL/connect first — then layout/retry if queued packets still don’t show.**
