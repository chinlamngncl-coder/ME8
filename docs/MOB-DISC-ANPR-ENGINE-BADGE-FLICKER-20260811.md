# MOB DISC — ANPR Engine badge ON/OFF flicker — 2026-08-11

**Status:** APPLIED — see `MOB-DISC-ANPR-ENGINE-BADGE-STABLE-V1-APPLY-20260811.md`  
**Read:** `.cursorrules`
---

## Short answer

The badge is **not** a power switch. It polls health **every 5 seconds**.  
**One slow/failed poll → “Not available”. Next good poll → “OK”.** That is the flicker you see.

Lab check just now: direct `127.0.0.1:8768/health` ×8 = **all OK**. So the sidecar can be fine while the **UI still blinks** if Node/API poll sometimes fails or times out under live load.

---

## Why it flips

| Cause | What happens |
|-------|----------------|
| **A. Poll UI (main feel)** | `anpr-live-watch.js` every 5s. Any `fetch` fail / bad JSON / `runtime.ok` false → paint **bad**. No “sticky OK”. |
| **B. Busy sidecar** | Live watch hammers `/track` + `/read-macro`. Same process answers `/health`. Under load, health can **timeout** (Node client ~8s) → badge OFF → next tick ON. |
| **C. Heavy health work** | Health still pulls FastALPR + vehicle + YOLO status helpers. If one path hiccups, `ok` can dip even when server is up. |
| **D. Real restart (rarer)** | Process crash/restart → real OFF then ON. Less “every few seconds” unless crash loop. |

**Start watch does not cause ON.** Flicker = **health polling**, not engine “power cycling” for fun.

---

## Customer?

Yes — same badge logic ships. Busy live site → more timeouts → more flicker. Must fix before pack (sticky + light health).

---

## Recommended MOB (one)

**`ANPR-ENGINE-BADGE-STABLE-V1`**

1. UI: need **2–3 consecutive fails** before “Not available”; one OK clears (or keep last OK for 15–20s).  
2. Health: keep **light** (no Stage-2 Ultralytics load on health — already partly done).  
3. Optional: raise health timeout slightly under load.  

Not another Stage-2 train MOB.

```text
MOB-APPLY ANPR-ENGINE-BADGE-STABLE-V1
```
