# MOB DISC — What we do next (Track B soak + latency)

**Date:** 2026-07-15 ~00:34  
**Status:** ACTION ORDER — discussion only; code only after you say **MOB-APPLY** for a named item  
**Context:** Hour soak started **00:16**; mid BYE unknown yet; latency = drag-to-live ~2–3 s, creeps without drag

---

## Right now (you)

1. **Let the hour finish.** Do not restart WVP/ZLM/Fleet mid-soak.  
2. Prefer: screensaver off, PC awake, leave tiles playing.  
3. Optional notes: when you must **drag**; smooth-late vs stutter; any black hole ~**00:40** (~24 min).  
4. At ~**01:16** (or whenever you stop): **you Stop** both tiles, tell agent **“soak done”**.

Agent then: pull WVP/ZLM for `[收到bye]` / re-点播 vs clean hold → write PASS/FAIL on **BYE**.

---

## After soak — decide by result

```
Hour soak ends
    │
    ├─ Mid BYE again (~24 min)?
    │     YES → A: cam session dig (best) and/or later auto-replay MOB
    │     NO  → BYE genre parked for now
    │
    └─ Latency (separate lane)
          Path after drag already ~2–3 s = GOOD
          Creep without drag = still open
                │
                └─ Next genre: stamp prove, then live-edge if needed
```

Do **not** mix BYE fix and stamp in one APPLY.

---

## Ordered MOBs (say APPLY one name at a time)

| # | When | Name | Job |
|---|------|------|-----|
| **0** | Now | *(ops)* | Finish hour soak |
| **1** | Soak done | *(agent log)* | Report BYE yes/no — paper; no APPLY |
| **2** | Next | `mob-wvp-latency-measure` | 15 min no-drag samples both tiles (ops) |
| **3** | After 2 | `mob-wvp-modern-modify-stamp-1` | Modern ZLM only: `modify_stamp` **2→1**; **5 min abort** if fossil-like FAIL |
| **4** | Only if 3 PASS but still soft | `mob-wvp-modern-lowlatency-1` | `lowLatency` **0→1** alone |
| **5** | If bar still needs babysitting | `mob-wvp-lab-live-edge-nudge` | Soft seek to live when lag &gt; N s |
| **6** | If mid BYE still after soak | Cam max-session dig, else `mob-wvp-lab-auto-replay-after-bye` | Hide ~1 min hole |

**Parked / forbidden in this lane:** Gate-B `liveBufferLatencyChasing` stash recipe; fossil stamp re-run; wall / Firmware Gold; bundling 3+4+5.

---

## What “done” looks like

| Goal | PASS |
|------|------|
| Stability | 60+ min, **no** mid cam BYE (or blink &lt; few s with auto-replay) |
| Latency path | After at live edge, hand ~**2–3 s** (you already have this) |
| Latency creep | **No** drag babysitting for 30+ min (stamp and/or live-edge) |

---

## One line

**Finish this hour → read BYE from logs → then measure creep → then one modern stamp MOB → then live-edge nudge if the bar still walks — nothing else until you APPLY a name.**
