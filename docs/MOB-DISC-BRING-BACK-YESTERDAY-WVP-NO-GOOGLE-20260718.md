# MOB DISC — Bring back yesterday’s WVP picture · no Google · stop waste

**Date:** 2026-07-18 ~12:33  
**Status:** DISC — blunt · **no code until you APPLY**  
**Ask:** Online on 3988 — why 18080? Bring back what we did. Stop waste. Need Google?

---

## Short answers

| Ask | Answer |
|-----|--------|
| Need Google? | **No.** Cause is known. |
| Why 18080? | Optional 30s check — **skip it**. Not the job. |
| Why still FFmpeg on 3988? | Chin is on **Fleet live** · WVP `startPlay` **fails** · v2 keeps FFmpeg |
| Bring back yesterday? | **Yes — doable.** Means restore **WVP play path**, not more Soft Open UI |

---

## What yesterday actually was (not magic)

Proven ~30 min dual: **`live broker wvp-zlm primary`** · FLV `192.168.1.38:18088`

That needed:

1. Cams **playable by WVP** (GB to WVP / proxy **`:5060`**, WVP platform)  
2. Dashboard **`FM_LAB_WVP=1`** + WVP startPlay  
3. Soft Open-style **no Fleet INVITE fight** (Soft Open-only) while picture was WVP

**3988 online** = Fleet REGISTER/SOS path.  
**Does not** by itself make WVP `startPlay` work.  
That’s why v2 looks “unchanged” (FFmpeg) — fail-open, not forgotten work.

---

## What we will **not** do

- Soft Open UI storm / pin chrome pile  
- “Park / give up”  
- Blind port flip with no APPLY  
- Google for a solved wiring gap  

---

## Concrete next (one APPLY — bring back picture path)

```text
MOB-APPLY restore-yesterday-wvp-zlm-picture-chin
```

**That APPLY will (when you paste it):**

| Do | Don’t |
|----|--------|
| Turn Soft Open-only **on for picture path** (skip Fleet INVITE for Chin live so WVP can play — same as yesterday’s working mode) | Soft Open UI freestyle |
| Keep `FM_LAB_WVP=1` · Chin thin allowlist | Touch gold pin / PTT cores |
| Fail clearly in log if WVP still can’t play | Lie that 3988 online = ZLM |

**BWC (Chin) — one row for WVP video (same as yesterday Soft Open):**

| Field | Value |
|-------|--------|
| IP | `192.168.1.38` |
| Port | **`5060`** |
| Platform | `44010200492000000001` · domain `4401020049` · pwd `admin123` |

This is **not** a new invention — it is what yesterday’s WVP picture used.  
Fleet-only `:5062` = classic FFmpeg (today). WVP picture = **`:5060` WVP** (yesterday).

If you refuse any key change: we **cannot** bring yesterday’s ZLM picture back — only classic. Say **`stay-classic`**.

---

## Order after you APPLY

1. Agent flips env/code for restore path  
2. You set Chin to table above → save → reboot Chin  
3. `RESTART-FLEET.bat`  
4. `localhost:3988` → Chin live  
5. Expect log `wvp-zlm primary` · FLV `:18088`  
6. Say **`yesterday-picture-ok`** or **`still-ffmpeg`**

---

**One line:** No Google; 18080 optional skip; 3988 online ≠ WVP play; bring back yesterday = APPLY `restore-yesterday-wvp-zlm-picture-chin` + Chin GB `:5060`/WVP platform (or stay classic).
