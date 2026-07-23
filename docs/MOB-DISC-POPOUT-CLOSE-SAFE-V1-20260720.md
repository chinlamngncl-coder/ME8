# MOB DISC — Popout Close safe (one MOB)

**Date:** 2026-07-20  
**Status:** APPLIED 2026-07-20 — operator test pending  
**APPLY when:** operator says `MOB-APPLY POPOUT-CLOSE-SAFE-V1`

---

## Plain English

**Command Wall:** close the window → main ops map and panels are fine.

**Matrix / panel popout today:** Close can still send `stop-video` and **might** stop the BWC if the popout was the only viewer.

**What we want:** Close = **dismiss the emergency / individual monitor**. Wall panel and map pin **keep live**.

---

## One MOB (not four options)

**`POPOUT-CLOSE-SAFE-V1`**

| File | Change |
|------|--------|
| `liveViewers.js` | Surfaces: `matrix-popout`, `live-popout` (separate from `ops`) |
| `matrix.html` | Close → destroy local player only; no wall stop |
| `live.html` | Same |
| Server | Popout `start-video` / `stop-video` use popout surface |

**Stop ■** in popout can stay as today (stops cam on wall) unless operator orders a change later.

---

## Harm plan slot

After matrix V2 PASS → **phase 5b** → then pin MOB phase 6.

See `MOB-DISC-WVP-HARM-100-CONSOLIDATION-FIX-PLAN-20260720.md` §H.2.
