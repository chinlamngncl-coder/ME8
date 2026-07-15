# MOB DISC — FR rail snap → live video on alert · 6 rotate · no 7th bloat

**Status:** DISC 2026-07-11 — **no APPLY**  
**Trigger:** 5+1 alert slot leaves slots **not rotating**; alternative — **snapshot card morphs to live video** + detail panel (crop + watchlist + Ack/PTT/Field). Worried **7 videos** breaks 8 cap.  
**Search:** rail to video, snap morph, toast expand, 7 stream, rotation plan  
**Related:** `MOB-DISC-FR-6TILE-OFFTILE-ALERT-SOP.md`, `MOB-DISC-FR-32-PROBE-QUEUE.md`, `MOB-DISC-FR-6TILE-MULTI-ADMIN.md`

---

## Your idea (summary)

1. Keep **6 patrol tiles** — all rotate through 32 watch set.  
2. On blacklist hit from **off-tile** snap: that **snapshot rail cell** turns from **still → live stream**.  
3. Toast click → expanded view: **video on top** + **match crop + watchlist photo + meta** below + **Ack · Dismiss · Field · Standby PTT**.  
4. Question: is that **7th BWC video**? Will it bloat?

**Verdict: Doable — and better UX than a fixed Alert box.** With correct **stream accounting**, it usually does **not** add a 7th server decode.

---

## Part A — “2 BWC not rotated” (5+1 problem you spotted)

### 5+1 layout issue

| Slot | Rotates? |
|------|----------|
| P1–P5 | Yes (5 of 32 at a time) |
| **AL (Alert)** | **No** — reserved |
| Hit steals patrol slot | That patrol slot **paused** until Ack |

So you effectively lose **1–2 slots** from pure rotation:

- **AL** never in rotate queue  
- Stolen patrol slot **frozen** during alert  

With **32 watch**, only **5** patrol streams cycle — slower full video cycle (**~128s** per set math vs 6).

### Fix: **6 equal rotate** + rail morph (your proposal)

| Surface | Count | Rotates? |
|---------|-------|----------|
| Main grid | **6** | **All 6** rotate through 32 |
| Snapshot rail | 16 cells | Rolling stills; **one cell may morph to live** on hit |
| Dedicated alert tile | **0** | **Removed** |

**No fixed non-rotate slot.** Alert lives in **rail**, not grid.

---

## Part B — Rail snap → video morph (locked design)

### Normal rail cell

```
┌─────────────┐
│  [still]    │  rolling snap, 4:3
│  Officer X  │
└─────────────┘
```

### On `fr-blacklist-hit` (match on that snap)

```
┌─────────────┐
│ ▶ LIVE      │  JSMpeg in same card (red border pulse)
│  Officer X  │  small canvas — same aspect slot
└─────────────┘
     ↓ click toast or card
┌──────────────────────────────┐
│  LIVE (larger)               │
├──────────────────────────────┤
│ [crop]  [watchlist photo]    │
│ Name · % · BWC · GPS · time  │
│ [Ack][Dismiss][Field][PTT…]  │
└──────────────────────────────┘
```

### States (no blank)

| State | Rail cell |
|-------|-----------|
| Empty | Dashed placeholder “—” |
| Rolling snap | Still JPEG |
| **Match** | **Live mini-player** + red ring |
| Expanded (drawer) | Video + detail + actions |
| After Ack | Hold thumb 5s → back to still or empty |

**Toast:** Red strip — `{name} · {score}% · {BWC}` — click **focuses** expanded drawer for that `hitId`.

---

## Part C — Is this 7 videos? (resource truth)

### Two different costs

| Cost type | What counts |
|-----------|-------------|
| **Server ffmpeg** (pool) | **Distinct camId** with active SIP/decode — **hard cap 8** |
| **Browser JSMpeg** | **Canvas players** — CPU; **same cam twice = 2 players, 1 stream** |

### Scenarios

| Case | Main grid | Rail live | Distinct pool streams |
|------|-----------|-----------|------------------------|
| Hit cam **already on 1 of 6 tiles** | 6 | Rail shows **same** stream (2nd WS client) | **6** |
| Hit cam **off-tile** | 6 others | Rail starts **new** stream for hit cam | **7** |
| Hit cam **off-tile**, promote to **swap** weak patrol tile | 6 (one replaced) | Rail still + tile both same cam | **6** |

**Worst case:** 6 rotating **distinct** cams + 1 **new** off-tile hit = **7 distinct** → **7/8 live cap** → **OK** (1 headroom).

**Not worst case (common):** Hit matches cam **already in grid** → **6 distinct**, rail reuses fan-out → **no bloat**.

### vs “8 tiles too hard”

| Layout | Distinct streams | Why we said 8 hard |
|--------|------------------|---------------------|
| 8 main tiles | **8/8** full | **No** SOS/map headroom |
| 6 main + rail morph (7th cam) | **7/8** | **1 left** — acceptable |
| 6 main + rail same cam as tile | **6/8** | **Best** |

**Rail morph does not automatically mean 7 ffmpeg** — only when hit is from **off-tile** and not stealing a grid slot.

### Browser bloat

| | Load |
|--|------|
| 6 main JSMpeg | Baseline |
| +1 **small** rail JSMpeg (320px wide) | **~+15–25%** decode pixels vs 6th full tile |
| Expanded drawer (one large) | Temporary; can **pause** smallest patrol tile |

**Smarter than 5+1:** mini live in rail uses **less pixels** than a full 7th grid cell.

### Policy (locked)

```text
FM_FR_MAX_DISTINCT_LIVE = 7   # FR watch hard stop before 8
FM_FR_RAIL_LIVE_ON_HIT = 1    # morph rail to video
FM_FR_PROMOTE_POLICY = reuse|swap|rail-only
```

| Policy | Behaviour |
|--------|-------------|
| **reuse** (default) | If hit cam on grid → rail fan-out only |
| **swap** | If off-tile → replace **lowest** unpinned patrol tile |
| **rail-only** | Off-tile live **only** in rail mini-player (7th stream) |

**Recommend:** `reuse` then `rail-only`; **swap** optional operator setting.

---

## Part D — Operator SOP (rail morph)

| # | Event | System | Operator |
|---|-------|--------|------------|
| 1 | Off-tile snap matches | Rail cell **turns live**; red toast; chime; HQ bar | Sees **which BWC** on rail immediately |
| 2 | Click toast or rail cell | **Alert drawer** opens: video + crop + ID photo + GPS | Read · decide |
| 3 | Investigate | Map link · Standby PTT · Field alert | Act |
| 4 | Ack / Dismiss | Drawer closes; rail → thumb → rolling; toast clears | Continue watch |
| 5 | Second hit | Next rail slot morphs; drawer queues | HQ **+N** |

**No full-screen trap** (align `MOB-DISC-FR-ALERT-UX-SOP-INDUSTRY-SOS-PARITY.md`).

### Rotation unchanged

- **6 main tiles** keep rotating 32 watch set on schedule.  
- Rail morph **does not** remove a tile from rotation (unless **swap** policy replaces one).  
- **0** dedicated non-rotate boxes.

---

## Part E — Layout wireframe (final recommendation)

```
┌─ 6 patrol (3×2) — ALL rotate ─────────────┐  ┌─ Snapshot rail ─┐
│  [1]  [2]  [3]                              │  │ s │ s │▶LIVE│ s │  ← hit morphs
│  [4]  [5]  [6]                              │  │ s │ s │ s  │ s │
└─────────────────────────────────────────────┘  └─────────────────┘
         ↑ 32 watch rotate                           ↑ click LIVE cell
┌─ Red toast (non-blocking) ─────────────────────────────────────────┐
│ FACE MATCH · Nguyen · 87% · BWC Chin · [Open] [Ack] [Dismiss]      │
└────────────────────────────────────────────────────────────────────┘
┌─ Alert drawer (on Open) ───────────────────────────────────────────┐
│ [ Live video — hit BWC ]                                             │
│ [ snap crop ]  [ watchlist mugshot ]   score · GPS · time          │
│ [ Ack ] [ Dismiss ] [ Field alert ] [ Standby PTT ] [ Map ]        │
└────────────────────────────────────────────────────────────────────┘
```

**Deprecate:** 5+1 fixed Alert box (prior DISC) → **rail morph wins**.

---

## Part F — MOB plan

| MOB | Delivers |
|-----|----------|
| `mob-fr-probe-queue-32` | Off-tile snaps produce hits |
| `mob-fr-6tile-all-rotate` | 6 grid, no reserved alert slot |
| `mob-fr-rail-snap-to-live` | Match card → mini JSMpeg |
| `mob-fr-alert-drawer` | Toast + expand: video + meta + actions |
| `mob-fr-stream-reuse-policy` | reuse / rail-only / swap; cap guard at 7 |
| `mob-fr-alarm-modal-retire` | Drawer replaces blocking modal (phase 2) |

**One at a time.** Checkpoint after rail morph + drawer.

---

## Part G — Rotation plan (32 / 6 / all snap)

| Mechanism | Coverage |
|-----------|----------|
| **Main 6** | Video rotate — 6 sets × ~20s ≈ **120s** full 32 video tour |
| **Probe queue** | All 32 snap — **~10–60s** full pass (engine dependent) |
| **Rail** | All hits visible as still or **live morph** |
| **Non-rotate count** | **0** reserved slots |

**Pinned tile:** 1 cam skips rotate (operator choice) — same as today.

---

## FAQ

| Question | Answer |
|----------|--------|
| 2 BWC not rotated in 5+1? | **Yes** — AL + stolen slot; **fixed by 6 all-rotate + rail morph** |
| Snap → video wonderful? | **Yes — recommended** over empty alert box |
| 7 videos hurt? | **7 distinct max** = 7/8 OK; often **6** (reuse stream) |
| 8 bloat fear? | **8 main tiles** = bad; **6 + rail mini** = OK |
| Doable? | **Yes** — fan-out + policy + drawer MOBs |

---

## Bottom line

| Decision |
|----------|
| **32 / 6 video / all snap** — unchanged |
| **6 tiles all rotate** — no dedicated alert slot |
| **Hit → rail cell morphs to live** + toast → **drawer** with full SOP actions |
| **7th stream** only when off-tile hit; **reuse** when cam already on grid — **not automatic bloat** |

**Preferred over 5+1.** APPLY path:

```text
MOB-APPLY mob-fr-probe-queue-32
MOB-APPLY mob-fr-6tile-all-rotate
MOB-APPLY mob-fr-rail-snap-to-live
MOB-APPLY mob-fr-alert-drawer
```
