# MOB DISC — Still offline · set BWC to Fleet 5062

**Date:** 2026-07-18 ~01:12  
**Status:** Log re-check — still no Fleet register  
**Ask:** Operator “no” (still not online)

---

## Log now

- Dashboard still **UP** (`3988` = 200 · you connected 01:12)
- Still **no** `register ok` after 01:00 offline
- Cams still hit **WVP :5060** (proxy patch lines) — that does **not** light classic Fleet online

---

## You do (Chin first)

On **Chin** web UI / SIP settings:

| Field | Set |
|-------|-----|
| Server IP | `192.168.1.38` |
| Port | **`5062`** ← not 5060 |
| Platform / domain | Fleet: `3402000000` / id `34020000002000000001` / pwd `12345678` |

Save → reboot Chin → wait 1 min → refresh `http://localhost:3988`

Then same for **kk** if Chin comes green.

---

**One line:** Still offline on Fleet because cams are on WVP 5060, not Fleet 5062 — change port to 5062 and save.
