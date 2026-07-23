# MOB DISC — `localhost:3988` OK? vs LAN IP

**Date:** 2026-07-18  
**Status:** DISC — paper only — **no code**  
**Ask:** “`http://localhost:3988` not online. I am using localhost — is OK?”

**Search:** `localhost 3988`, `127.0.0.1 dashboard`, `LAN vs loopback`

---

## Short answers

| Question | Answer |
|----------|--------|
| Is **localhost** OK for Ops on **this PC**? | **Yes** — same as `http://127.0.0.1:3988` |
| Prefer for lab habit? | **`http://192.168.1.38:3988`** (matches BWC / WVP / PTT LAN story) |
| Put **localhost** on the **BWC**? | **No** — cams need real Wi‑Fi IP `192.168.1.38` |
| Use **172.x**? | **Never** (WSL/Docker bridge) |

---

## Right now on this desk (check ~01:03)

| Probe | Result |
|-------|--------|
| `http://127.0.0.1:3988` | **200** (online) |
| `http://localhost:3988` | **200** (online) |
| Fleet log | `dashboard listening` → `http://192.168.1.38:3988` · SIP **:5062** |
| Login | `global` connected after restart ~01:02 |

So if the browser said “not online,” it was likely **during Fleet restart** (log shows stop ~01:01:47, up ~01:01:51), wrong tab/PC, or a stale cache — **not** because localhost is forbidden.

---

## When to use which URL

| Who | Use |
|-----|-----|
| **You, browser on the Fleet PC** | `localhost:3988` **or** `127.0.0.1:3988` **or** `192.168.1.38:3988` — all fine |
| **Phone / other PC on Wi‑Fi** | Only `http://192.168.1.38:3988` (localhost on that device = that device, not Fleet) |
| **BWC SIP / PTT / FTP / Msg** | Always **`192.168.1.38`** — never localhost, never 172 |
| **WVP UI on same PC** | `http://localhost:18080` OK · or `http://192.168.1.38:18080` |

---

## If it really will not open

1. Confirm Fleet is up — `RESTART-FLEET.bat` finished; wait ~5–10s.  
2. Try `http://127.0.0.1:3988` (skips odd `localhost` → IPv6 quirks).  
3. Try `http://192.168.1.38:3988`.  
4. Still dead → tell agent; do **not** invent WVP flag flips for “dashboard offline.”

---

## Lock

- Localhost for **dashboard on the same PC** = OK.  
- Lab default we print = **`192.168.1.38:3988`** so BWC and browser stay one story.  
- Infra MOB ports disc still stands; classic flags still off.

**One line:** Localhost:3988 is fine on this PC; desk probe says Fleet is up — prefer 192.168.1.38 for habit; never put localhost/172 on the BWC.
