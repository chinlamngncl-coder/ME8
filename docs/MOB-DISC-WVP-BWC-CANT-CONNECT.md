# MOB DISC — BWC “can’t connect” to WVP for one-tile test

**Status:** talk only — **no apply**  
**Date:** 2026-07-14  
**Search:** `WVP 403`, `platform ID`, `密码/SIP服务器ID错误`

---

## Plain answer

**Yes — those GB fields must match WVP**, or the cam will not stay online.

Wrong **platform ID** or **password** → WVP replies **403** (“password / SIP server ID wrong”).  
That is not a Fleet bug. That is the cam talking to WVP with the wrong desk ID.

---

## Exact match (this lab)

| Cam field | Must be |
|-----------|---------|
| Server IP | `192.168.1.38` |
| Port | **5061** |
| Platform / SIP server ID | `44010200492000000001` |
| Domain (if separate) | `4401020049` |
| Password | `admin123` |

Device ID / channel can stay your Yulong IDs (e.g. kk `…0009`).

If you leave **Fleet’s** old platform ID while port is 5061 → **403 / not connected**.

---

## What the log already showed (today)

1. Several tries: **403** — password or platform ID wrong on the cam.  
2. Then **register success** for kk `34020000001329000009`.  
3. Right after that, WVP listed kk **online**.

So: if the cam menu still says “can’t”, check you saved the platform ID + `admin123`.  
If WVP already shows online → use the **Fleet** page, not only the cam screen:

`http://192.168.1.38:3988/test-wvp-tile.html` → Refresh → Play.

---

## Two different “connected”

| Place | Meaning |
|-------|---------|
| Cam GB menu | Registered to WVP desk |
| WVP UI / our tile page | Sees device online → Play works |

Fleet wall (**5060**) stays separate. This test only needs **one** cam on **5061**.

---

## If it still won’t stick

Most common: platform ID still Fleet’s old value, or password not `admin123`, or still on port **5060**.  
Recheck those three only — not “all settings from zero.”
