# MOB DISC — Weapon Recent: scroll dead, no mag glass, snaps slow (2026-08-07)

**Status:** disc only. No code until APPLY.  
**Operator:** Scroll still broken (tiring). Snaps slow. Where is magnifying glass?

---

## Confirm — you are right

We talked. It was **not finished**. CSS `overflow-y: auto` alone ≠ working Recent history.

| Pain | Reality today |
|------|----------------|
| **Scroll** | HTML has only **4 fixed slots**. JS paints into those 4 only. Server can keep ~20 hits; UI never grows a scrollable list. Scrollbar you see is weak / useless for “more history.” **Not fixed.** |
| **Magnifying glass** | Click-open lightbox exists in code (`openWdLightbox`) — **no** FR/ANPR-style **mag icon** on the card. If click feels dead or unknown, it feels like “no magnify.” **Mag chrome missing.** |
| **Slow snap** | Expected on this lab: Colab **B = RF-DETR Medium on CPU** (often **0.5–2+ s** per still) + poll ~**2 s** + need **2** confirms + **~20 s** dedupe before a new Recent card. Feels late vs live gun in the tile. |

B accuracy can be OK (your gun snaps) while **UI + CPU latency** still feel bad.

---

## Why “we tried” but it came back

Earlier disc named `WEAPON-RECENT-SCROLL-MAG-V1`.  
CONTEXT-MAG added **context crop + click lightbox** — **not** dynamic scroll list + visible mag.  
Then Fleet/WVP/Colab wire ate the queue. Scroll/mag **never got a real APPLY pass**. Fair to be tired.

---

## Recommendation (one APPLY — UI + speed lab knobs)

`MOB-APPLY WEAPON-RECENT-SCROLL-MAG-FAST-V1`

Exact scope:

1. **Scroll:** Recent = growing list (many cards), rail scrolls with wheel; not stuck at 4 empty slots.  
2. **Mag:** Visible magnifier on each hit (FR/ANPR style) + click → lightbox (+ hover zoom if cheap).  
3. **Faster Recent (lab, no new train):**  
   - Confirm **1** (was 2) for lab  
   - Dedupe **~8–10 s** (was 20)  
   - Poll **~1.5 s** if CPU allows  
   - Keep Colab **B** on 8769 (no A talk)  
4. Cache-bust Weapon JS/CSS.  

Does **not** make Medium RF-DETR instant on i9 CPU — that needs GPU later or Nano distill. This APPLY makes UI usable and snaps show up sooner.

---

## Standing

Scroll broken = **4-slot UI**, not operator error.  
No mag icon = **never shipped**.  
Slow = **CPU B + confirm/dedupe**, not “B unused.”

Say the APPLY above when you want it fixed in one go.
