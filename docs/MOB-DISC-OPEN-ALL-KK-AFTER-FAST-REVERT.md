# MOB DISC — Open All kk dead (after fast-lab revert)

**Status:** DISC only — **no MOB-APPLY**  
**Date:** 2026-07-14 ~02:46  
**Operator:** wall **panel play OK**; **Open All** — kk bad; checkpoint fail  

**Search:** `Open All kk`, `invite_stuck`, `zlm relay thrash`, `clients:7`

---

## Plain English

Single-cam wall play works.  
**Open All** with Chin + kk does **not** — kk never settles.

This is **not** the reverted “fast lab” tee (that code is already out of the pool).  
Something else is still fighting Open All.

---

## What the log shows

| Fact | Meaning |
|------|--------|
| kk `invite_in_flight` over and over | Dashboard keeps asking start while SIP invite not finished |
| kk `clients` rises to **6–7** | Too many watchers on one cam (wall + pins + lab relay + retries) |
| kk `pool stop deferred` → **`invite_stuck`** forced stop | Invite never cleaned up; Open All gives up on kk |
| Chin `zlm relay` start/stop/start | Gate C **auto** side relay still on (`FM_LAB_ZLM=1`) |
| Chin relay ffmpeg **Error selecting an encoder** / RTMP fail | Side relay noise — not needed for wall JSMpeg |
| Voice hint lines on Chin | **Red herring** — not why Open All fails |

---

## Likely top problem

**Lab ZLM is still ON for every live cam** (Gate C adapter).  
Open All + side relay + many WS clients = invite pile-up. kk loses.

Wall panel play (one cam) can still look fine.

---

## What to do next (pick when you leave DISC)

**First (safest, no code):** turn lab ZLM off for wall proof:

```
FM_LAB_ZLM=0
```

(or `FM_ZLM_ENABLED=0`), then `RESTART-FLEET.bat`, Open All again.

If Open All PASS with ZLM off → lab ZLM/Gate C is the smoker.  
If still FAIL → not ZLM; look at Open All invite race only.

**Do not** chase “fast like WVP” until Open All checkpoint is green with a quiet lab.

---

## Not this DISC

No pool tee again. No wall wipe. No WVP on the wall.
