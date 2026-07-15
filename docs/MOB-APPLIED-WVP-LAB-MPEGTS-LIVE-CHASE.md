# MOB APPLIED — Lab soft live-chase (`mob-wvp-lab-mpegts-live-chase`)

**Date:** 2026-07-15 ~01:22  
**APPLY:** operator `APPLY: soft live-chase`  
**Scope:** Track B Lab WVP tiles only — **not** wall / Open All / pins / Fleet ZLM / stamp  

**Disc:** `MOB-DISC-WVP-PRIORITY-CONSOLIDATED.md`, `MOB-DISC-WVP-GOOGLE-SOFT-CATCHUP-EVIDENCE.md`

---

## What changed

File: `public/js/wvp-lab-tile.js`  
Cache: `public/index.html` → `?v=20260715-live-chase`

| Behavior | Detail |
|----------|--------|
| Soft catch-up | If `buffered.end - currentTime` &gt; **1.5 s** → `playbackRate = 1.12` |
| Real-time | Delay ≤ 1.5 s → `playbackRate = 1` |
| Emergency snap | Delay &gt; **10 s** → seek near live edge (Wi‑Fi hole / tab debt) |
| Tab focus | `visibilitychange` visible → chase (soft or snap) |
| Tick | Every **1 s** while playing |
| mpegts hard chase | **`liveBufferLatencyChasing: false`** (bundled build has no `liveSync`) |

---

## Operator prove

1. Hard refresh dashboard (cache bust).  
2. Play A + B.  
3. Drag bar left so lag ~5–8 s → should **soft chase** (log: `soft chase`); no routine hard skip.  
4. Leave tab 1–2 min / switch away → come back → should catch up (soft or snap if &gt;10 s).  
5. Normal soak: hand lag stays near live without babysitting the bar.

**PASS:** ~2–5 s typical without drag; no minutes of lag from chase itself.  
**FAIL / abort:** minutes lag, constant hitch, or tiles die — say so; we revert chase timers.

---

## Not in this MOB

Stamp / Jessibuca / FR / wall / Evidence record policy.
