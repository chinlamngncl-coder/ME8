# MOB DISC — BWC: do you change the IP? FINAL LOCK

**Date:** 2026-07-17  
**Status:** Paper lock — read this only for BWC typing  

---

## Answer

**NO. Do not change the BWC server IP.**

Keep:

| Field | Value |
|-------|--------|
| Server IP | Your PC Wi‑Fi IP — lab **`192.168.1.38`** (not 172.x) |
| Port | **5060** |
| Domain | `4401020049` |
| SIP server ID (long) | `44010200492000000001` |
| Password | `admin123` |
| Device ID | Cam’s own (Chin / kk) — do not change |

**One row only.** Same as today if already set like this.

---

## What we change (PC only — not you on the cam)

| Thing | Who | What |
|-------|-----|------|
| WVP `hostAddress` inside software | Agent / Fleet | Real cam Wi‑Fi (`.131` / `.132`) so Soft Open can **call** the cam |
| Fleet SIP listen | PC | **5062** (not typed on BWC) |
| Host SIP proxy | PC | **5060** (BWC already points here) |

The cam’s **own** Wi‑Fi address is automatic. You never type `.131` / `.132` into the BWC “server” field.

---

## Do not

- Do not set BWC server to `192.168.1.131` or `.132`  
- Do not set BWC to `172.x`  
- Do not flip port to 5061 / 5062 for this path  
- Do not put Fleet platform `340200…` / `12345678` when using WVP video  

---

## One line

**BWC server IP stays the PC (`192.168.1.38`) · port 5060 · WVP ids. No IP change on the cam.**
