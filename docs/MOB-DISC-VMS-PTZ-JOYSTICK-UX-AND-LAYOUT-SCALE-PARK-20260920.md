# MOB DISC — VMS PTZ joystick UX + layout scale (PARKED)

**Status:** PARKED — paper only. **No code** until a named `MOB-APPLY`.  
**Date:** 2026-08-20 brainstorm + **2026-09-20** operator lock-to-park  
**Related:** `docs/MOB-DISC-VMS-COMMAND-SPATIAL-SHELL-BRAINSTORM-20260820.md` (Operator + Cursor + **Google AI**)  
**Also parked earlier this session:** PTZ direction (ONVIF GetStatus), mast auto up/down, BWC pin heading (needs device course)

---

## Why this exists

Operator asked to **record** the VMS track so it is not lost after AES / pins / other urgent MOBs.

Ops top chrome today feels **too many options / too complicated** (university demo, not scaled VMS). Left **DEVICES** roster + **SOS** strips will become unusable as **hundreds** of BWCs come online (endless vertical lists).

Tactical / Command Wall / geo-tools already have **PTZ move logic** (`VmsPtzJoystick`). Do **not** rebuild the engine — **revamp UI/UX into VMS** and scale the shell.

---

## Parked work (order when we start)

| Priority | Name | Intent |
|----------|------|--------|
| 1 | `VMS-PTZ-JOYSTICK-UX-V1` | Pro virtual joystick chrome on VMS (reuse Tactical logic) |
| 2 | PTZ direction cue | ONVIF `GetStatus` + per-cam north offset; map/status arrow |
| 3 | Mast auto up / down | After gear/API path is named |
| 4 | Layout / nav scale-down | Fewer top options; Ops not a tab dump |
| 5 | Roster + SOS scale | Search / groups / virtualize — not a 200-row wall |

**Gate before this genre:** finish AES unlock path + map offline last-known / pin presence work + other named important MOBs. Then start with **`MOB-APPLY VMS-PTZ-JOYSTICK-UX-V1`**.

---

## Locked product facts (do not invent opposite)

1. **WVP / Fleet stay** — finish frontends; do not park video base or start a second app.  
2. **One Axiom** — BWC ops + fixed-cam VMS share evidence/incident spine (see Aug 20 brainstorm).  
3. **Reuse PTZ path** — UX revamp, not a second joystick stack.  
4. **Agent:** no daily nag of this park. Remind only when operator says VMS / PTZ / mast / layout scale / ship-pack related.

---

## Google / Aug 20 carry-forward (short)

Already on paper in the Command Spatial Shell brainstorm: two maps (Ops GIS vs VMS floor), VMS Command tab shape, no indoor pin-storm on Ops, multi-select / batch live as open debate with Google. **This disc adds:** joystick UX, direction, mast, and **explicit scale-down** of top nav + long roster/SOS lists.

---

## APPLY (when ready — not now)

```
MOB-APPLY VMS-PTZ-JOYSTICK-UX-V1
```

Later named APPLYs for direction, mast, layout scale, roster virtualize — one at a time.
