# MOB DISC — INVITE timeout NAT/routing trace (Google 3 steps) · 2026-07-17

**Status:** Trace done · Soft Open still FAIL · **no APPLY this disc**  
**Symptom:** WVP `消息超时未回复` / `-1024` · fleet `receive_stream_timeout`  
**BWC server IP:** still PC `192.168.1.38` · **5060** — **do not change**

---

## Step 1 — WVP target (`hostAddress`) — CHECKED

Postgres `wvp_device` **now**:

| Device | ip | host_address | port | online |
|--------|-----|--------------|------|--------|
| Chin `…008` | `192.168.1.131` | **`192.168.1.131:46133`** | 46133 | t |
| kk `…009` | `192.168.1.132` | **`192.168.1.132:33881`** | 33881 | t |

LAN map matches. **Not** `172.21.0.1`. **Not** `192.168.1.38:5060`.

**Meaning:** WVP is aimed at the **real BWC Contact** (what Google asked for).  
**Side effect:** INVITE goes **Docker WVP → cam LAN direct**. It does **not** go to host SIP proxy `:5060`, so the proxy **cannot** rewrite/forward that INVITE.

---

## Step 2 — SIP proxy forwarding — CHECKED (logic + implication)

Proxy (`wvp-sip-lan-proxy.js`) **only** relays INVITE when:

- Packet arrives on host **:5060**, and  
- Peer looks like WVP outbound → then `invite relay → cam` log + send to mapped LAN.

With `hostAddress` = real LAN, **WVP does not send INVITE to :5060**.  
So proxy **will not log** `invite relay → cam` during Soft Open — **by design of real-LAN MOB**, not because “log missing.”

Proxy **does** still handle **REGISTER** cam → `:5060` → `:15061` (WVP sees peer `172.21.0.1`).

**Existing logs already print** `invite relay → cam` / `invite relay drop` when that path fires. Extra `console.log` not required to know current Soft Open skips the proxy.

---

## Step 3 — Packet capture — PARTIAL (tool limits)

| Tool | Result |
|------|--------|
| Wireshark / tshark | **Not installed** |
| `pktmon` | **Access denied** (needs Admin elevated shell) |
| Host TCP probe | `127.0.0.1:5060` / `:15061` **OK** |
| Host TCP probe | `192.168.1.131:46133` / `.132:33881` **FAIL/timeout** (no TCP accept on Contact port from PC — SIP may be UDP-only on that socket even if “register TCP” set) |
| API Soft Open prove | still `receive_stream_timeout` after invite-rtp ready on real LAN |

**Absolute Wireshark truth:** operator must run **Admin** Wireshark/pktmon:

```
Capture filter: udp port 5060 or tcp port 5060 or udp port 15061 or tcp port 15061
  or host 192.168.1.131 or host 192.168.1.132
```

Then Soft Open once and answer: does INVITE leave toward `.131:46133`? Any 200 OK back?

---

## Where INVITE dies (best evidence now)

```
REGISTER path:  Cam → PC:5060 (proxy) → Docker:15061 (WVP)   ✅ online
INVITE path:    WVP (Docker) → 192.168.1.131:46133 (direct)   ❌ no SIP reply → 消息超时未回复
Proxy INVITE:   NOT USED (hostAddress ≠ PC:5060)
```

So this is **not** “proxy absorbed INVITE” under current DB.  
It is **Docker-direct INVITE to BWC Contact never completed** (routing / NAT / firewall / transport mismatch).

Chin TCP vs kk UDP A/B already showed **both FAIL** → not Chin-UDP-only.

---

## Architecture conflict (locked)

| Mode | hostAddress | INVITE path |
|------|-------------|-------------|
| **A — real LAN** (current) | `.131:46133` | WVP → cam direct · proxy blind |
| **B — via proxy** (older invite-rtp) | `192.168.1.38:5060` | WVP → proxy → cam · needs working relay |

Google’s “must target real NAT pinhole” matches **A**. Lab fail matches **A broken from Docker**.  
Fix options (need named MOB later — not this disc):

1. **`mob-wvp-invite-via-proxy-again-v1`** — hostAddress back to PC `:5060`; prove `invite relay → cam` in proxy log; keep real LAN only in map.  
2. **Docker host-network / publish + prove** Docker can UDP/TCP reach `.131:.132` Contact (Admin capture).  
3. Operator Admin Wireshark to confirm packet die point.

---

## Ask Google (copy)

`host_address` is already real LAN `192.168.1.131:46133` / `.132:33881`. Soft Open still `-1024 消息超时未回复`. INVITE therefore bypasses host proxy `:5060`. REGISTER still via proxy (`172.21.0.1`). Should we force INVITE via proxy signal address again, or fix Docker→LAN routing for direct INVITE? Chin register TCP did not fix; kk still UDP — both fail.

---

## Operator (no IP change on BWC)

1. Optional: Admin Wireshark as above + Soft Open once.  
2. Do **not** change BWC server IP.  
3. Say **MOB-APPLY** only when choosing path A-fix vs B-proxy.

---

## One line

**hostAddress already real LAN — INVITE skips proxy and dies with no SIP reply; need proxy-again MOB or Docker→LAN capture, not another BWC IP change.**
