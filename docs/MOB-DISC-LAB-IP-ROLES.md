# MOB DISC — Lab IP roles (38 vs 111)

**Status:** Reference — not a code change  
**Search:** `192.168.1.38`, `192.168.1.111`, `HOST`, `wifi`, `SIP contact`

---

## Short answer

**Wi‑Fi did not move from 38 to 111.**

| IP | What it is |
|----|------------|
| **`192.168.1.38`** | **Fleet C2 server** (your PC) — dashboard `:3988`, SIP, PTT, media |
| **`192.168.1.111`** | **kk BWC** on the LAN — the camera’s own Wi‑Fi address |
| **`192.168.1.120`** | **Chin BWC** on the LAN (today’s log; can change if DHCP renews) |

BWCs **call into** `.38`. They do **not** replace `.38`.

---

## How to read fleet.log

**Server (always .38):**
```
dashboard listening | url http://192.168.1.38:3988
group config sent | host 192.168.1.38
```

**Device (different IP per BWC):**
```
register ok | camId 34020000001329000009 | contact sip:…@192.168.1.111:…
pool rtp received | from 192.168.1.111
```

`contact` and `from` are the **body-worn camera**, not the server.

---

## Lab bench today (2026-07-06)

| Device | camId | LAN IP (from logs) |
|--------|-------|-------------------|
| Chin | `34020000001329000008` | `192.168.1.120` |
| kk | `34020000001329000009` | `192.168.1.111` |
| Fleet C2 | — | `192.168.1.38` |

Device IPs can change on DHCP — **server `HOST` in `.env` stays the PC address** (`.38` unless you move the PC).

---

## kk drop at 13:28 — not an IP migration

kk was on **`.111` before and after** the drop. The event was `register_expired` + live `BYE`, then immediate re-register on the **same** `.111` with a new UDP port (`47787`).

---

## Operator rule

- Open dashboard: **`http://192.168.1.38:3988`**
- Do **not** point BWC server config at `.111` — that is the camera itself
