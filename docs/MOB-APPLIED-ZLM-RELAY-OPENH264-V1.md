# MOB-APPLIED: mob-zlm-relay-openh264-v1

**Date:** 2026-07-16  
**Status:** APPLIED  
**Google:** Plan B crash `Unknown encoder 'libx264'` — use pack-safe encoder  
**Disc:** `docs/MOB-DISC-GOOGLE-REPLY-PLAN-A-B-COPY-VS-OPENH264.md`

## Change

| File | Change |
|------|--------|
| `lib/zlmLabRelay.js` | `-c:v libx264 …` → `-c:v libopenh264` + bitrate (same pattern as conference / evidence) |

**Not used:** `-c:v copy` — pool WS is mpeg1video; FLV/RTMP needs H.264 re-encode.

## Explicitly not in this MOB

- WVP media-online / startPlay  
- SIP TCP / 5060  
- Wall invite order  

## Operator (plain)

1. Double-click **`RESTART-FLEET.bat`** (Yes on UAC if asked) — see `docs/MOB-DISC-OPERATOR-WHAT-IS-UBITRONC2-RESTART.md`  
2. Hard refresh once  
3. Open live on **normal panel**  
4. Say pass/fail  

Agent checks log for **`live broker zlm-relay primary`**.  
If still 0 — honest FAIL + next MOB / Google ask. No fake win.
