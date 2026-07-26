# MOB-DISC — Tactical pin Stop still dead (Ops ≠ Tactical) — DO NOT MERGE

**Date:** 2026-07-25  
**Status:** ROOT CAUSE LOCKED · surgical fix applied  
**Operator anger:** Valid. Pin Stop/X did not stop. Forcing Ops black-panel Stop is unacceptable.  
**Hard rule:** **Ops panel is Ops. Tactical pin is Tactical.** Never merge / rebuild / “fix” by wiring pin live into Ops wall.

---

## What we will NEVER do

- Put Tactical pin video onto the Ops wall to “make stop work”
- Make Ops the only place that can stop a Tactical open
- Rebuild Ops / wall / Firmware Gold pin-mirror
- Ask you to redo Soft Open / wall parity work

---

## Why Stop failed (honest)

Previous “fix” called:

```js
global.socket.emit('stop-video', …)
```

**`global.socket` is not set.** Dashboard socket lives inside `VideoWall.init(socket)` only.  
So pin Stop/X **destroyed the pin player** and then **silently returned** — WVP/BWC kept live.

That is why you still had to open Ops, find a **black panel**, and press Stop (that path uses VideoWall’s real socket).

A second foot-gun in the same patch: if `opsWallClaimsCam()` was true for a black/zombie panel, we **skipped** server stop entirely. Wrong for your case.

---

## Correct product rule

| Action | Meaning |
|--------|---------|
| Tactical **Stop** / **X** | Stop **this pin’s** live + release server stream **when Ops is not showing real live video for that cam** |
| Ops wall **Stop** | Unchanged — stops Ops |
| Ops has **real** live tile for that cam | Pin close must **not** BYE that stream (two surfaces can coexist) |
| Ops has **black / empty claim** only | Pin Stop may release stream (same outcome as you pressing Ops Stop) — **without** opening Ops or redesigning wall |

---

## Surgical fix (this MOB)

1. Stop using `global.socket`.  
2. Use `VideoWall.emitOperatorStopVideo(camId, reason)` → **same** `stop-video` bus Ops Stop already uses.  
3. Guard only on **real** wall live (`wallHasPlayerForCam` / live frame) — **not** vague `opsWallClaimsCam`.  
4. No assign-to-slot, no Soft Open from Tactical, no wall UI rebuild.

---

## Operator smoke (you)

1. Restart + Ctrl+F5  
2. Tactical only → Select zone → Open cameras → live on **pin**  
3. Press pin **Stop** (or X)  
4. **PASS** = stream dies; you do **not** go to Ops  
5. Optional: Ops tile actually live on same cam → pin Stop closes pin only; Ops stays  

FAIL = still need Ops black panel → tell AI immediately; do not accept another “concept rewrite.”

---

## Lock phrase

**Pin Stop must stop the stream. Ops stays Ops. Tactical stays Tactical. No merge.**
