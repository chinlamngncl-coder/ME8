# MOB DISC — BWC menu: only IP + “local port” — where is 6000?

**Date:** 2026-07-23  
**Status:** DISC only — **no APPLY**  
**Ask:** “I don’t have an extra port for 6000 — I only have IP and local port. Not sure what that is.”  
**Related:** `MOB-DISC-GOOGLE-MSG-WS-VS-FLEET-CHAT-20260723.md`

---

## Plain English

You are **not** missing a magic third box labeled “6000” on every screen.

On most BWCs, the fields you see (**server IP** + **local port**) are for **SIP / GB / YDT register** — how the cam finds the **platform for live/video/signaling**.  

**Port 6000** is a **different service** on the **same PC**: the **message WebSocket** (HQ Messages chat). Many firmwares:

- hide it under a **separate** menu (消息 / Message / IM / Msg server), or  
- fill it **automatically** when the platform sends `MsgServerIP` / `MsgServerPort`, or  
- never expose it at all (then chat needs a companion app / vendor option).

So: **local port ≠ 6000.** Mixing them up is why chat never connects while video can still work.

---

## What “IP” and “local port” usually mean on the BWC

| Field you see | Usually means | Lab value (example) |
|---------------|---------------|---------------------|
| **Server IP** / 平台IP / 服务器 | Your PC’s **Wi‑Fi/Ethernet** address (never 172.17–172.31 Docker) | `192.168.1.38` |
| **Port** / 端口 / **平台端口** | Where the cam **registers** (SIP) | **GB video → WVP: `5060`** · **YDT/Fleet signaling → `5062`** |
| **Local port** / 本地端口 | Port **on the BWC itself** (device side Contact / listen). Often auto or 5060-ish. **Not** the message server. | Leave default unless vendor says otherwise |

**Local port** = “my camera’s own door,” not “Fleet message door 6000.”

### Dual protocol (your lab)

| Protocol on cam | Server IP | Platform port |
|-----------------|-----------|---------------|
| **GB28181** (video) | same PC IP | **5060** (WVP) |
| **YDT** (buttons / telemetry) | same PC IP | **5062** (Fleet) |

Neither of those rows is the Messages WebSocket.

---

## Where port **6000** lives (message chat)

Fleet listens here (from our log):

```text
[Messaging] websocket listening | port:6000 | deviceUrl: ws://192.168.1.38:6000
```

| Who | Port | Job |
|-----|------|-----|
| You (operator) | — | Use HQ **Messages** panel |
| Fleet PC | **6000** TCP inbound | Message WebSocket |
| BWC | Opens **outbound** to `ws://PC_IP:6000/...` | Must connect or HQ text never arrives |

You do **not** type 6000 into the **SIP local port** box.

### Where to look on the device (if the menu exists)

Names vary by OEM (Chinese/English):

- 消息服务器 / Message server / Msg server / IM / 即时消息  
- Sometimes under **YDT** or **advanced / more**  
- Fields there might be: **Msg IP** + **Msg port** (= **6000**), or one URL line  

If you **only** see SIP IP + local port and **no** message submenu at all → that firmware may **not** open `:6000` by itself. Then Google’s “companion opens WS” path applies, or chat stays dead until vendor enables it.

Our server also **pushes** hints over SIP:

```xml
MsgServerIP / MsgServerPort / MsgServerUri  →  e.g. ws://192.168.1.38:6000
```

Some cams use that silently; others ignore it. Log proof of success is still: **`msgWss bound`**.

---

## What you should set (simple)

1. **SIP/GB/YDT screens:** IP = `192.168.1.38` (your real LAN). Ports = **5060** / **5062** as above. **Do not put 6000 in local port.**  
2. **If you find a Message server screen:** IP = same `192.168.1.38`, **port = 6000**.  
3. **If there is no Message screen:** don’t invent a port on the SIP page — tell us “no message menu”; then options are companion / vendor / accept chat limited.  
4. Windows firewall must allow **inbound TCP 6000** on the PC (separate from 5060/5062).

---

## Quick confusion map

| You thought | Actually |
|-------------|----------|
| “I need a 6000 field next to local port” | Often **no** — different menu or auto |
| “Local port should be 6000” | **Wrong** — breaks SIP; won’t fix chat |
| “No 6000 box = messaging impossible forever” | Maybe hidden, maybe auto, maybe firmware lacks it — check log for `msgWss bound` |
| “Video works so messages must work” | **No** — video ≠ message WS |

---

## One line

**IP + local port = SIP register (5060/5062). Port 6000 = separate message WebSocket — don’t put it in local port; look for a Message server menu or accept the cam may never open chat without vendor/companion.**
