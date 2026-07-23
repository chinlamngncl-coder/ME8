# MOB DISC — Fat Open All / Clear map pins (not HTTPS)

**Date:** 2026-07-23  
**Status:** PAPER — honest why; **no fix until you APPLY**  
**Operator:** Buttons look fat/ugly; we said Ops would stay alone when CSS unified — why?

---

## Short answer

**HTTPS / WSS (C1–C2) did not change these buttons.**  

They got fat from the earlier **global CSS button bridge** (`GLOBAL-UI-ROLLOUT-V1`). That rule made **every** `.btn.btn-action` / `.btn.btn-ghost` taller (min-height 32px, bigger padding) on **all** pages.

Ops fleet buttons use those same classes:

- `Open All (Up to 8)` → `btn btn-action … fleet-open-all-pins`
- `Clear map pins` → `btn btn-ghost … fleet-clear-pins`

So the “unify buttons” paint spilled onto Ops. That **breaks** the promise in the rollout doc that said Map / Open All would stay unchanged. **That was a mistake.**

Your small Ops styles (`padding: 4px 8px`, `font-size: 10px`) lost to the stronger global rule.

---

## What we agreed vs what happened

| Said | What actually happened |
|------|-------------------------|
| Don’t wreck Ops map / Open All when unifying CSS | Global `.btn.btn-action` / `.btn.btn-ghost` hit Ops anyway |
| HTTPS genre = secure door + sockets | True — **no** Ops button CSS in C1/C2 |

---

## Fix (APPLIED)

**`MOB-APPLY OPS-FLEET-PIN-BUTTONS-COMPACT-V1`** — done: `MOB-APPLIED-OPS-FLEET-PIN-BUTTONS-COMPACT-V1-20260723.md`  
Compact override for `#fleet-open-all-pins` + `#fleet-clear-pins` only.

---

## One line

**Fat buttons were CSS rollout leak (not HTTPS); compact fix APPLIED for those two Ops buttons only.**
