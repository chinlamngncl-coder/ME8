# MOB DISC — BWC: one address, one port (Fleet + WVP/ZLM)

**Date:** 2026-07-17  
**Status:** Paper lock  
**Supersedes for BWC typing:** dual GB+YDT “two rows” talk when the cam has **only one** server line  
**Also:** `MOB-APPLIED-FLEET-SIP-PORT-5062-V1.md` (PC stack) · never use `172.x`

---

## Rule

BWC UI = **one** server IP · **one** port · **one** platform id · **one** password.  
No second address. No “Fleet port + WVP port” on the same cam.

---

## Want Fleet dashboard video via WVP/ZLM?

**Change the BWC to these** (do not keep old Fleet SIP ids on the cam):

| BWC field (typical label) | Key this |
|---------------------------|----------|
| Server / IP | Your PC **Wi‑Fi** IP (lab example `192.168.1.38`) — **not** 172 |
| Port | **5060** after proxy restart — if cam stays offline, check host has UDP/TCP **5060** listen (not only 5061) |
| Domain / realm | `4401020049` |
| SIP server / platform ID (long) | `44010200492000000001` |
| Password | `admin123` |
| Device ID | **Keep the cam’s own** GB id — do **not** paste the platform id here |

That is **WVP** (proven in running `me8-wvp` env). Same IP your dashboard uses. One row only.

**Not WVP (Fleet-only — wrong for this path):** platform `340200…` / pwd `12345678` / realm `3402000000`.

**Lab check 2026-07-17:** WVP IDs above are correct in Docker. Offline cause seen: host SIP proxy was still on **5061** while docs said **5060**. Restart `START-WVP-LAB` so proxy listens **5060**, then save BWC.

---

## What stays on the PC (you do not type this on BWC)

| Piece | Port / note |
|-------|-------------|
| WVP GB (host proxy) | **5060** ← cam talks here |
| Fleet Node SIP | **5062** ← for later / other devices; **not** this one-row cam |
| Dashboard | **3988** |
| Msg / GPS path if already working | keep as today |

Fleet **calls WVP** for play. Cam does **not** register to Fleet for video.

---

## Old Fleet settings on the cam?

| Keep old (Fleet id + old port/password) | Result |
|-----------------------------------------|--------|
| Yes | Cam stays married to **Fleet SIP** → **not** real WVP/ZLM native video |
| No — use table above | Cam married to **WVP** → Soft Open / wall can use WVP→ZLM |

**For WVP/ZLM video: do not remain on old Fleet platform id/password.**

---

## Before you change the cam

1. Stop Fleet → start WVP lab (proxy on **5060**) → start Fleet (Fleet SIP **5062**).  
2. Then save the one-row WVP values on the BWC.  
3. Check WVP device list: cam **online**. Then Soft Open.

---

## One line

**One IP + port 5060 + WVP platform `4401020049` / pwd `admin123`. Not Fleet 5062. Not two addresses.**
