# MOB DISC — Weapon detection: live BWC, auto alarm, nearby help, battery (2026-08-05)

**Status:** disc only. No code until you type an APPLY line below.  
**Scope:** product lock for Weapon detection. Not FR/ANPR engine. Not device SOS firmware.

## Confirm: I understand

You want Weapon detection when a BWC is **online**, and often **already live**.

1. Officer may **not** have time to press **SOS**. Can we **auto-alarm** and pull **nearby** fellows?
2. Can we run video **in the background** (like live FR / ANPR stills) so HQ does not need to watch 100 tiles?
3. **Battery** will burn if every cam streams. Other ideas? If it is a bad idea for an active officer, we can **skip** that burn.

Weapon UI today is only: *coming when licensed.* License flag exists. No engine yet.

## Honest answers

### Auto alarm + nearby — yes, but not “press SOS for them”

SOS today = **officer (or fall) on the device** → HQ banner, map circle, nearby team, PTT.

FR hit today = HQ alert only. Nearby PTT is **click**, not auto.

**Do not** remotely fire the BWC SOS button. False gun hits would fake “I pressed SOS.” That is dangerous.

**Do this instead:** a separate **Weapon alarm** that **reuses SOS nearby geometry**:

- HQ red banner: **WEAPON** (not SOS)
- Map: that BWC + circle + nearby fellows (same idea as SOS team)
- Auto-group nearby on PTT / standby radio (this is the “no time to press SOS” part)
- Crop + time on Weapon Recent / History
- Officer’s own SOS button still works as today

Need **2–3 frames** in a row (not one lucky still) before auto nearby. Holster, phone, tool, TV, partner’s belt will false-hit.

### Background video — same idea as FR / ANPR, not 100 players

FR / ANPR live do **not** open 100 browser players. Server grabs **stills** from streams that are **already live**, then runs the engine.

Weapon should do the same:

- Cam **online + already streaming** (Ops / FR / ANPR / wall already invited) → server stills in background → weapon engine
- HQ can look at another screen; detection still runs
- Cam online but **not streaming** → **no pixels** → no detect

There is no “camera off, still see guns.”

### Battery — do **not** live-invite all 100 patrol cams all day

| Idea | Battery | Verdict |
|------|---------|---------|
| Detect only on cams **already live** | No extra vs today | **Do this** |
| Background INVITE every online BWC 24/7 | Burns radio + battery hard | **Don’t** (you said skip if bad for active officer) |
| Dispatcher **Arms** weapon watch on N units | Burn only those, on purpose | Later optional |
| AI on the BWC chip | Best battery | Not this firmware / not ME8 now |

Chest cams also see **holsters and partners** all shift. Always-on weapon AI on every live cam is often noisy. Live-only + multi-frame + clear **WEAPON** label is the honest v1.

## Locked product (after you APPLY the first slice)

1. Weapon watch = **already-live** BWCs only. No silent fleet-wide INVITE.
2. Hit → **Weapon alarm**, not fake device SOS.
3. Nearby fellows + map circle **yes** (SOS-like help without SOS button).
4. Background stills on the server **yes** (FR/ANPR pattern).
5. 100-cam always-live for weapons **no**.

## One next APPLY

**`MOB-APPLY WEAPON-LIVE-WATCH-SHELL-V1`**

Unlock Weapon tab (if licensed). Live roster + Recent like FR/ANPR. Poll **already-live** cams only. Engine can be stub/health first; real detect + auto-nearby is the next MOB after the shell PASSes.

## Operator pass (after that APPLY)

Analytics → Weapon detection opens (not “coming”). Online live cams can be watched. No extra battery on cams that were not already live. No SOS fake-press.
