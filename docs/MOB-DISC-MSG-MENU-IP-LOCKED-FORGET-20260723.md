# MOB DISC — Message menu forbids IP/port: can HQ text still go out?

**Date:** 2026-07-23  
**Status:** DISC only — **no APPLY**  
**Ask:** BWC message menu blocks typing IP / ports (likely vendor lock). Can messages still go out? If not → **forget messaging**.  
**PDF:** `C:\Users\user\Desktop\智能执法仪软件协议说明书V1.3).pdf` (§9 消息服务)  
**Related:** `MOB-DISC-GOOGLE-MSG-WS-VS-FLEET-CHAT-20260723.md`, `MOB-DISC-BWC-IP-LOCAL-PORT-VS-MSG-6000-20260723.md`

---

## Plain English (verdict)

**No — not with this firmware/UI as we see it. Forget HQ↔BWC messaging for these units.**

Vendor PDF §9 is clear: text only rides a **WebSocket** to a message server (`ws://IP:6000/login?user=…`).  
If the message menu **forbids keying IP/port**, the officer cannot point the cam at Fleet `:6000`.  
Fleet already pushes `MsgServerIP` / `MsgServerPort` / `MsgServerUri` over SIP (`pushMsgServerHints` + OnlineStatus). Lab logs still show **listen-only, never `msgWss bound`**. That means the cam is **not** opening the message channel from those hints either.

Without that socket, HQ Send **cannot** deliver (server hints then **drops** the text). Same block for device→HQ replies.

**Recommendation:** park / forget messaging on this BWC build. Do not spend more MOBs on chat packing, retry queues, or companion IM until a firmware that either (a) auto-connects from SIP MsgServer fields, or (b) lets you enter message-server IP:6000.

---

## What the PDF actually requires (V1.3 §9)

| Fact | Source |
|------|--------|
| Messaging = **WebSocket + private binary** (not SIP MESSAGE) | PDF p.18 “消息服务” |
| Connect URI shape | `ws://<IP>:6000/login?user=<SIP>,pwd=…,type=1` |
| After login OK → send/recv with `dwCMD=76`, ack `77` | PDF p.19–22 |
| How the **UI** gets IP/port | **Not specified** — protocol assumes the cam already knows where to connect |

PDF never says “SIP register alone is enough.” It assumes a message-server endpoint is configured somehow (menu, OEM flash, or platform push the firmware understands).

---

## What we already do (no missing “Google protocol”)

| Piece | ME8 |
|-------|-----|
| Listener | `0.0.0.0:6000` (`msgWss`) |
| SIP push | `DeviceConfig` + `OnlineStatus` with `MsgServerIP/Port/Uri` |
| HQ UI | Messages → `send-message` → cmd-76 queue **if** socket open |
| If socket closed | Log “asleep” → `pushMsgServerHints` → **return (drop)** |

Protocol stack is present. **Bind never happens.**

---

## Risk analysis (locked menu)

| Option | Meaning | Risk | Pick? |
|--------|---------|------|-------|
| **A — Forget messaging** | Stop work; leave `:6000` listener idle; no more chat MOBs | Product gap (no text to cam) — honest | **Yes** |
| B — Hope SIP hints alone | Wait for firmware to honor MsgServer* without menu | Already failing in lab; more time, same result | No |
| C — Force via ADB / OEM tool | Vendor engineering channel, not Fleet product | Out of scope; may brick / void | No unless you have vendor support |
| D — Build alternate text path (SMS, MQTT, companion APK) | New product surface | Large; against “finish Fleet, don’t invent” | No |

**One path:** **A — forget.**

---

## Operator meaning

- **SIP IP + local port** (5060/5062) = video/register — **not** the message server.  
- Message server needs **its own** host + **6000** (or `FM_MSG_WS_PORT`).  
- Menu locked → you cannot set that.  
- Auto-provision from Fleet → **not proven on these cams** (no `msgWss bound`).

---

## When to reopen (only if evidence changes)

Reopen messaging only if **one** of these becomes true:

1. Log shows `msgWss bound` for Chin/kk after register (no menu change), **or**  
2. Vendor unlocks message-server IP/port entry / ships a build that documents MsgServer DeviceConfig, **or**  
3. You approve a **named** companion/ADB provisioning MOB (separate product).

Until then: **forgotten** — same shelf as abandoned hybrid SIP text work.

---

## Do not APPLY

No code. No retry-queue MOB. No layout-flip MOB. Listener can stay; it costs nothing and does not help until a device connects.
