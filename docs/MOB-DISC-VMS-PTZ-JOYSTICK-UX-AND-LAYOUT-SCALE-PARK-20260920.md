# MOB DISC — VMS PTZ joystick UX + layout scale

**Status:** `VMS-PTZ-JOYSTICK-UX-V1` done → **`VMS-PTZ-PRO-CONTROL-V1` APPLIED** (2026-09-21) — 8-way pad, speed, presets 1–8, `FM_PTZ_LAB_MOCK=1` for BWC UI smoke.  
**Still parked:** PTZ direction map / mast / layout scale / roster virtualize.  
**Date:** 2026-08-20 brainstorm + **2026-09-20** park + **2026-09-21** joystick UX apply  
**Related:** `docs/MOB-DISC-VMS-COMMAND-SPATIAL-SHELL-BRAINSTORM-20260820.md`  
**Also parked:** PTZ direction (ONVIF GetStatus), mast auto up/down, BWC pin heading (needs device course)

---

## Why this exists

Operator asked to **record** the VMS track so it is not lost after AES / pins / other urgent MOBs.

Ops top chrome today feels **too many options / too complicated** (university demo, not scaled VMS). Left **DEVICES** roster + **SOS** strips will become unusable as **hundreds** of BWCs come online (endless vertical lists).

Tactical / Command Wall / geo-tools already have **PTZ move logic** (`VmsPtzJoystick`). Do **not** rebuild the engine — **revamp UI/UX into VMS** and scale the shell.

---

## Work order

| Priority | Name | Intent | Status |
|----------|------|--------|--------|
| 1 | `VMS-PTZ-JOYSTICK-UX-V1` | Pro virtual joystick chrome (reuse Tactical logic) | **DONE** |
| 2 | PTZ direction cue | ONVIF `GetStatus` + per-cam north offset; map/status arrow | **APPLIED** direction-map + **`VMS-PTZ-NORTH-CALIBRATE-V1`** (Edit → Calibrate Direction → Set North) |
| 3 | Mast auto up / down | After gear/API path is named | Parked |
| 4 | Layout / nav scale-down | Fewer top options; Ops not a tab dump | Parked |
| 5 | Roster + SOS scale | Search / groups / virtualize — not a 200-row wall | Parked |

---

## Locked product facts (do not invent opposite)

1. **WVP / Fleet stay** — finish frontends; do not park video base or start a second app.  
2. **One Axiom** — BWC ops + fixed-cam VMS share evidence/incident spine.  
3. **Reuse PTZ path** — UX revamp, not a second joystick stack.  
4. **Agent:** no daily nag of this park. Remind only when operator says VMS / PTZ / mast / layout scale / ship-pack related.

---

## APPLY next (do not guess)

```
MOB-APPLY VMS-PTZ-DIRECTION-MAP-V1
```

Or layout: `MOB-APPLY VMS-LAYOUT-SCALE-DOWN-V1`
