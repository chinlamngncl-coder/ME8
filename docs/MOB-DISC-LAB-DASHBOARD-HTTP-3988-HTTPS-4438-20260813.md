# MOB DISC — Lab dashboard URL: HTTP vs HTTPS (3988 / 4438)

**Date:** 2026-08-13  
**Audience:** Operator  
**Lab `.env` (ME8 / `C:\ME8`):**

| Role | Port | Use this |
|------|------|----------|
| **HTTP** | **3988** | `http://192.168.1.38:3988` |
| **HTTPS (TLS)** | **4438** | `https://192.168.1.38:4438` |

Flags: `FM_HTTPS_ENABLED=1`, `FM_HTTPS_PORT=4438`. HTTP on 3988 **stays**.

---

## What your errors meant

| What you typed | Error | Why |
|----------------|-------|-----|
| `192.168.1.38:4438` refused | Node/HTTPS not listening (Fleet not up, or HTTPS failed to bind) | Need Fleet running first |
| `https://…:3988` → **ERR_SSL_PROTOCOL_ERROR** | Port **3988 is HTTP**, not TLS | Browser asked for HTTPS on a plain HTTP port |

**Yes, lab has TLS** — but on **4438**, not on 3988.

---

## What to open now (pick one)

1. Start **Fleet/Node** from `C:\ME8` (leave window open).  
2. Then either:
   - **Easy lab:** `http://192.168.1.38:3988`  
   - **TLS lab:** `https://192.168.1.38:4438` (may warn on self-signed cert — Continue / Advanced once)

Do **not** mix: https + 3988, or http + 4438 (wrong combo).

---

## Daily remember (one line)

**HTTP → 3988 · HTTPS → 4438 · same PC IP `192.168.1.38` · home folder `C:\ME8`.**

Ports do not randomly change mid-day unless `.env` is edited or you open a different product folder.

---

## Locked

- Never tell operator to use `172.17`–`172.31` as server IP.  
- WVP/ZLM base unchanged by this disc.  
- Customer ship gets its own fixed URL in pack docs — lab table above is for **this** ME8 `.env`.
