# MOB DISC — Drag bar to the end = jump back to “live” (~2–3 s)

**Date:** 2026-07-15 ~00:26 (+08)  
**Operator:** Drag the line beside play → latency ~**2–3 s** (good). Without drag, picture **keeps falling behind** until drag again. Hand test after drag-to-end ≈ **2 s**.  
**Status:** DISCUSSION only — no code mid-soak  
**Related:** `MOB-DISC-WVP-LAB-TILE-LATENCY-30S.md` (felt ~30 s before understanding the bar)

---

## Plain English — what is that bar?

It is **not** a “movie progress” bar for VOD.

On live FLV/MSE (mpegts.js + `<video>`):

| End of bar | Meaning |
|------------|---------|
| **Right end** | Newest video the browser already has (**live edge**) |
| **Playhead in the middle** | You are watching **older** buffered frames |
| **Drag to the end** | Jump playhead to the newest → **catch up to live** |

So when you drag to the end and hand latency is ~**2–3 s**, that is near the **true path delay** (cam → ZLM → network → decode). That is **good**.

When it feels ~**30 s**, you are usually **not** on the live edge — you are playing from a **backlog** that built up. The drag “fixes” it by seeking forward.

---

## Why it keeps getting slower

Typical creep (no exotic bug required):

1. Player starts near live (~2–3 s).  
2. Small stalls / jitter / CPU / tab throttle → it **buffers** instead of dropping behind-time frames.  
3. Playhead stays on old frames while **new** data piles at the right end.  
4. Felt latency grows (10 s → 30 s…).  
5. Drag to end → back to ~2–3 s. Repeat.

Lab tiles today intentionally have:

```text
liveBufferLatencyChasing: false
```

So the player **does not** auto-jump to live. That matches what you see: **manual drag** is the “chase.”

**Parked hard:** turning aggressive `liveBufferLatencyChasing` / stash tricks on Gate B history caused **minutes** of lag — do **not** blindly flip that on.

---

## What your screenshot pattern means

- On-screen cam timer vs wall clock / hand ≈ path latency **after** you are at live edge.  
- Browser chrome time vs content timer can differ a few seconds while still “live.”  
- **30 s class** before drag ≈ **buffer debt**, not “ZLM always 30 s slow.”

Correct the earlier “A is 30 s path” feel: **measure only after drag-to-end (or auto equivalent).** Path PASS target ≈ **2–3 s**. Creep PASS = **does not need drag every few minutes**.

---

## Two different problems (do not mix)

| Problem | What you want |
|---------|----------------|
| **Path latency** (after at live edge) | Stay ~**2–3 s** (you already have this when dragged) |
| **Live-edge creep** (bar walks left / lag grows) | Stay at end **without** babysitting the bar |

Mid-soak **cam BYE** (~24 min) is still a **third** problem — separate from this bar.

---

## Ways to solve creep (after hour soak — talk then APPLY)

| Approach | Notes |
|----------|--------|
| **A. Gentle auto live-edge** | Periodically `currentTime = buffered.end` (or mild chase) **only if** delay &gt; e.g. 5 s — safer than full Gate-B chasing recipe |
| **B. Drop frames on stall** | Prefer skip-to-live over long buffer — trade: possible short glitch |
| **C. Keep manual drag** | Lab-only OK; not operator product |
| **D. ZLM stamp / lowLatency** | May help path or stamp spam; **won't replace** live-edge seek if player buffers forever |
| **E. Screensaver / tab throttle** | Can **accelerate** creep when tab hidden — soak with display awake still useful |

Named candidates (not applied):

- `mob-wvp-lab-live-edge-nudge` — soft seek-to-live when lag &gt; N seconds  
- Do **not** name-apply Gate B `liveBufferLatencyChasing` stash-off recipe without a new scoped MOB + short prove

---

## How to measure during this hour

1. Drag both A and B to the **end**.  
2. Hand wave → should be ~**2–3 s**.  
3. Do **not** touch bar for 10–15 min.  
4. Note felt lag; if huge, glance whether playhead left the right end.  
5. Drag again → if back to ~2–3 s, creep confirmed.

Log later: whether BYE still fires ~24 min **independent** of bar.

---

## One line

**The drag bar’s right end is “live”; ~2–3 s after drag is real good path latency — the 30 s feel is the player falling behind that edge because auto catch-up is off; fix creep with a careful live-edge nudge later, not blind buffer chasing.**
