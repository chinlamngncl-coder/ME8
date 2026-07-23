# MOB DISC — What IP/port/platform · why BWC “not on platform” · why Ops online is fake

**Date:** 2026-07-19  
**Status:** DISC — paper only — **no code**  
**Ask:** What IP, port, platform? Why am I not on platform (BWC did not show)? Why software shows online if I’m not? Fake?

---

## Short answers

| Ask | Answer |
|-----|--------|
| Ops green online = cam really married to platform? | **Not always.** Can be **painted** |
| Is that “fake”? | **Yes — for Fleet SIP.** Flag `FM_WVP_FLEET_PRESENCE=1` copies “online” from WVP API into Ops dots |
| Why BWC UI doesn’t show “on platform”? | Cam’s **own** SIP menu / status ≠ Ops paint. Wrong keys or wrong port → cam unhappy while Ops still green |

---

## Two different “homes” (do not mix)

### A) Classic Fleet (FFmpeg live)

| Field | Value |
|-------|--------|
| IP | `192.168.1.38` |
| Port | **`5062`** |
| Domain / realm | `3402000000` |
| Platform ID | `34020000002000000001` |
| Password | `12345678` |

Real online = log **`register ok`** to Fleet `:5062`.

### B) WVP picture (yesterday Soft Open / restore path)

| Field | Value |
|-------|--------|
| IP | `192.168.1.38` |
| Port | **`5060`** |
| Domain / realm | `4401020049` |
| Platform ID | `44010200492000000001` |
| Password | `admin123` |

Real online for WVP = cam REGISTER to proxy `:5060` → WVP; WVP device list online.

**One row on BWC.** You pick **A or B** for that cam — not both IPs, not “Ops online means keys are right.”

---

## Why Ops shows online when it feels fake

Right now `.env` has:

```text
FM_WVP_FLEET_PRESENCE=1
```

Log proof (examples):

- `device online from wvp presence` · Chin / kk  
- Later often `device offline` · `keepalive_timeout` / `register_expired` on **Fleet** SIP  

So Ops can light green because **software asked WVP “is device online?”** and painted the roster — **not** because Fleet got a solid REGISTER keepalive.

That is why it feels fake: **dot ≠ your BWC platform screen.**

Turn presence off (`FM_WVP_FLEET_PRESENCE=0`) → dots follow **real Fleet REGISTER** only (classic honesty). Needs named APPLY if you want that flip.

---

## Why BWC “did not show” on platform

Common cases:

1. Cam keyed to **Fleet** `340200…` / `:5062` but lab is in **WVP picture** mode (or the reverse).  
2. Cam keyed to WVP ids but port still **5062** (talks Fleet with WVP id — messy; status UI confused).  
3. Ops green from **presence paint** while cam never finished WVP REGISTER / shows offline in cam UI.  
4. Cam UI “platform” page = vendor screen; it does **not** mirror Mobility Ops dots.

---

## What to do (no thrash)

1. Decide path for Chin **tonight**:  
   - **Classic video** → table **A** (`5062` / `340200…`)  
   - **WVP→ZLM video** → table **B** (`5060` / `440102…`)  
2. Key **only that table** on Chin → save → reboot cam.  
3. Trust log:  
   - Classic: `register ok` … `:5062`  
   - WVP: WVP UI / `wvp-zlm primary` — not presence paint alone  
4. If green dots without `register ok` → treat as **presence paint** until you APPLY presence off.

---

## Dashboard (you)

| | |
|--|--|
| Ops | `http://localhost:3988` (mic/PTT) |
| Never put localhost on BWC | BWC always `192.168.1.38` |

---

**One line:** WVP path = `192.168.1.38:5060` + `440102…`/`admin123`; classic = `:5062` + `340200…`/`12345678`; Ops online can be **fake paint** from `FM_WVP_FLEET_PRESENCE=1` — not proof BWC is on the right platform.
