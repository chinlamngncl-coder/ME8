# MOB-DISC: BWC auto-called without operator Start (2026-08-13)

## Plain English

**“Calling the BWC”** = Fleet sends **`start-video`** → WVP/SIP starts the camera stream (device lights up / goes live).

That is **not** the ANPR OCR bat by itself. OCR only **reads** a stream URL after play already exists (or after UI asked for play).

## Who can call a BWC (product paths)

| Who | When |
|-----|------|
| **ANPR Live** | Only after **Start watch** (or while watch is still on): each tile `startSlot` → `start-video`. Also **auto-recover** every ~3s if tile errors while watch still on. |
| **Ops / wall / map / FR / Command** | Their own Open / live / pin — same `start-video`. |
| **ANPR Python `/watch/start`** | Does **not** SIP-invite. Node posts it after slots + FLV URL. If FLV missing, Node skips (no ensurePlay from ANPR — locked). |

## What is NOT supposed to call

- Opening Analytics → ANPR with **no** Start watch  
- Restarting START-ANPR.bat alone  
- Pure `/watch/events` polling  

## Likely causes if you did not press Start watch

1. **Watch still on** from earlier (browser tab still running / Recover loop still firing `start-video`).  
2. **Another page** (Operations wall, FR, Command, map pin) still live on that cam.  
3. **Hard refresh** mid-watch left Fleet play up while UI looks idle.  

## What is NOT this MOB

- OCR merge / plate text  
- Server Lost banner (socket to Fleet)  

## Operator check (no APPLY yet)

1. ANPR: click **Stop all** once.  
2. Close extra dashboard tabs.  
3. If BWC still rings/live alone → say which screen was open (Ops / ANPR / FR).  

## If proven: ANPR recovers call with watching=false or page idle

**Next APPLY name:** `ANPR-NO-START-VIDEO-WITHOUT-WATCH-V1`  
(audit recover/rotate paths; never `start-video` unless `watching === true` and operator started this session).

## Rule

No code change this turn — disc only until you say that APPLY.
