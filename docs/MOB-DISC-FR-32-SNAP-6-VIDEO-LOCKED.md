# MOB DISC — FR locked split: 32 snap+match · 6 video only

**Status:** DISC locked 2026-07-11 — **operator clarification** (no APPLY)  
**Search:** 32 snap, 6 video, streaming save, watch set, probe vs decode  
**Parent:** `MOB-DISC-FR-32-PROBE-QUEUE.md`, `MOB-DISC-FR-RAIL-SNAP-TO-LIVE-ALERT.md`, `MOB-DISC-FR-LIVE-POLL.md`

---

## One sentence (you are right)

> **All 32 BWCs in the watch set are snapped and run through the FR engine for match; only 6 show live video at once — to save streaming and decode capacity.**

That is the product. It did **not** change. Earlier confusion was **implementation** (only 4 probed today), not **design**.

---

## Two different jobs (do not mix)

| Job | Count | What happens | Heavy? |
|-----|-------|--------------|--------|
| **A — Live video** | **6** | SIP invite · pool ffmpeg · JSMpeg on main grid · operator **watches** | **Yes** — bandwidth + CPU |
| **B — Snap + match** | **32** | Periodic JPEG still · detect · embed · 1:N vs watchlist · rail + alarms | **Lighter** — no full-time stream per BWC |

```
32 BWCs in watch set
        │
        ├─► 6 on main grid ──────────► full live video (rotate through 32 over time)
        │
        └─► all 32 in probe queue ───► snap + FR match (even when not on grid)
```

**Saving:** You do **not** need **32 live streams**. You need **6 video + 32 snap paths**.

---

## What “snapping” means (per BWC, whole watch set)

| Step | Off-grid BWC | On-grid BWC (1 of 6) |
|------|--------------|----------------------|
| Grab still | Headless / short pool tap (target) | From existing live stream |
| Detect face | FR engine (primary; DeepFace backup) | Same |
| Embed + 1:N | Match vs watchlist | Same |
| Snapshot rail | Crop appears if face OK | Same |
| Blacklist hit | Toast + rail morph + drawer | Same |

**Every BWC in the watch set gets B on a schedule** — not only the 6 on screen.

---

## What “6 video” means

| | Detail |
|--|--------|
| Visible | **6** tiles on main grid (3×2), all **rotate** through the 32 watch set |
| Purpose | Operator **sees** walking officers in real time |
| Pool | **≤6** full-time `analytics-fr` live sessions (plus rare 7th if off-tile hit — see rail DISC) |
| Not required | The other **26** do **not** need continuous video |

**Rotate example:** 32 watch ÷ 6 tiles ≈ 6 sets × ~20s → full **video tour ~120s**.  
**Snap example:** Probe queue cycles all **32** much faster (seconds–minutes once engine is fast).

---

## Streaming / capacity savings (why this design)

| Model | Live streams | Realistic for C2? |
|-------|--------------|-----------------|
| **32 video** (bad) | 32 | No — blows cap, SIP, CPU |
| **6 video + 32 snap** (locked) | **6** (+ headless grabs) | **Yes** — `FM_MAX_CONCURRENT_LIVE=8` leaves headroom |
| **4 video** (old UI) | 4 | OK but wasteful empty tiles for small BWC picture |

**Bandwidth (rough):**

- 6 live ≈ **3–6 Mbps** inbound to server  
- 32 snap ≈ brief grabs — **not** 32× continuous bitrate  

---

## Config (target, after MOBs)

```env
FM_FR_WATCH_MAX=32          # watch set size
FM_FR_VIDEO_SLOTS=6         # main grid live decode
FM_FR_PROBE_QUEUE_MAX=32    # all snap + match
FM_FR_PROBE_PARALLEL=6      # how many cams probed per tick
FM_MAX_CONCURRENT_LIVE=8      # site cap (6 FR + SOS/map headroom)
```

---

## Today vs target (honest one line)

| | Today (code) | Target (locked) |
|--|--------------|-----------------|
| Watch set | 32 ✓ | 32 |
| Video tiles | 4 | **6** |
| All 32 snap+match | **Only ~4 with stream** ✗ | **32 queue** ✓ |

**MOBs to close gap:** `mob-fr-watch-set-server-sync`, `mob-fr-probe-queue-32`, `mob-fr-headless-probe-grab`, fast engine.

---

## Operator FAQ

| Question | Answer |
|----------|--------|
| All 32 snapping and matching? | **Yes — that is the design.** |
| Only 6 on video? | **Yes — to save streaming.** |
| Rest still produce rail snaps / hits? | **Yes — via probe queue, not via 26 extra videos.** |
| Did design shrink from 32 to 4? | **No.** 4 was a **bug/shortcut** in probe code, not the spec. |

---

## Bottom line

**You are correct.**

- **32** = snap + FR match (whole watch set)  
- **6** = live video on screen (rotate)  
- **26** off-grid = still scanned — **without** 26 live streams  

That is how we save streaming capability and still justify **32 BWC** face watch.

**APPLY path unchanged:** probe queue MOBs first, then 6-tile + rail morph.
