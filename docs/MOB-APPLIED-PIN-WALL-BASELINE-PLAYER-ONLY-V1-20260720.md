# MOB APPLIED — PIN-WALL-BASELINE-PLAYER-ONLY-V1

**Date:** 2026-07-20  
**Status:** APPLIED — operator test pending  
**Disc:** `MOB-DISC-FLOOR-DESTROYED-BASELINE-THEN-PLAYER-ONLY-20260720.md`  
**Scope:** `public/js/video-wall.js` + cache bust in `public/index.html`

---

## Intent

Stop the stacked pin-MOB mess. **Baseline pin/open/dock UX** (Firmware Gold) + **only** WVP/ZLM as the wall/pin **video player** (mirror).

---

## What we did

| Action | Detail |
|--------|--------|
| **DELETE** | `schedulePinFlvMirrorChase` / chase timers / harden “wait forever” / `isHandoffWallForCam` attach gates |
| **KEEP** | WVP wall FLV attach (`attachWvpHandoffFlv*`) |
| **KEEP (player)** | Pin mirror = Gold RAF + handoff `<video>` when wall decoded (`wallMirrorSourceForCam`) |
| **RESTORE** | Gold `ensurePopupsForLiveWallCams` (`openPopup: true`) — already present |
| **RESTORE** | Gold `focusMapPinQuiet` dock timing (0 / 250 / 600) |
| **RESTORE** | Multi-live prove → ensure popups + one dock |

**Not touched:** Fit pins math, PTT/SIP cores, handoff env flags.

Cache: `video-wall.js?v=20260720-pin-wall-baseline-player-only-v1`

---

## Operator test (hard refresh once — no bat)

1. Ctrl+Shift+R  
2. Soft Open / play wall Live  
3. Pins should **auto-open** (baseline)  
4. **Call / PTT / Stop** on pin  
5. Pin picture = same as wall  

| PASS | FAIL |
|------|------|
| Open + Call + picture like day‑1 + WVP | Say which line failed |

---

## Next

After PASS: harm plan phase **8** (`WALL-AUDIO-PATH-V1`) or you name it.  
No more pin-layout invention MOBs unless you order one.
