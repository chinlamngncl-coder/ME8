# MOB DISC — FR map focus gate · not every alert · 8-BWC live priority

**Status:** DISC 2026-07-11 — **`mob-fr-map-focus-pin-v2` PASS** · **no APPLY**  
**Trigger:** Operator PASS on fuchsia map focus — now must **not** send every alert to Ops map (low-grade / borderline “cheaters” will drive operators crazy). When dispatch **does** need the catching BWC, what **priority** vs other operators’ live tiles under the **8-BWC site cap**?  
**Search:** map focus gate, cheater, grade tier, auto go-ops, live priority, preempt, 8 cap, multi admin  
**Related:** `MOB-DISC-FR-GRADE-TIERED-ALERT-URGENCY.md`, `MOB-DISC-FR-MAP-FOCUS-PIN.md`, `MOB-DISC-FR-6TILE-OFFTILE-ALERT-SOP.md`, `MOB-DISC-FR-6TILE-MULTI-ADMIN.md`, `MOB-DISC-FR-RAIL-SNAP-TO-LIVE-ALERT.md`, `MOB-DISC-LIVE-ONE-CAM-MULTI-USER.md`

---

## Plain answer

| You said | Locked direction |
|----------|------------------|
| Not all alerts should jump to map | **Correct** — map focus is **dispatch-grade**, not “every cosine twitch” |
| Small cheaters will pop up and operators go crazy | **Gate auto map** by **grade + score band + confirm**; keep rail/ledger for the rest |
| When we use this, do we take over the 8 BWCs others are watching? | **Sometimes yes** — but **map focus ≠ live takeover**; live uses a **priority ladder** with SOS on top |
| What priority? | **SOS > blacklist FR live > pinned Ops > suspect FR > patrol rotate > background probe** |

**`mob-fr-map-focus-pin-v2` today:** **explicit** “Go to map” always pans + fuchsia pin + popup. **Auto** `goOpsOnHit()` on every `fr-blacklist-hit` still fires for **all grades** — **must be gated next**.

---

## Part A — What “cheater” means here

Operators use “cheater” for matches that **technically pass threshold** but **should not hijack the room**:

| Type | Example | Today | Target |
|------|---------|-------|--------|
| **Low grade** | `poi`, `monitoring` on watchlist | Same red path if ever emitted | **Silent / rail only** — no map, no toast |
| **Borderline score** | 76–82% on `FM_FR_MATCH_MIN` 75 | Full red + auto go-ops | **Toast + rail**; auto map **off** unless grade is `blacklist` + score ≥ band |
| **Suspect grade** | Amber tier | Red today (wrong) | **Amber investigate** — map on **button**, not auto tab steal |
| **Engine noise** | Same person, one lucky frame | 45s dedupe helps once | **N-of-M confirm** (later engine MOB) before **high** tier |
| **Lab preview** | Layout test | Map blocked on preview | Stays blocked for auto; explicit shows hint |

**Rule:** Higher urgency can use lower UX. **Low urgency never uses dispatch map auto-focus.**

---

## Part B — Two different actions (do not conflate)

| Action | What it costs | Who should get it |
|--------|---------------|-------------------|
| **A — Map focus** (v2 PASS) | Map pan, pin popup, fuchsia pulse — **no new ffmpeg** if pin already has GPS | Operator **clicks Go to map**, or **auto** only for gated high tier |
| **B — Live promote** | **Pool slot** (1 of 8 site-wide) + SIP invite | **Blacklist hit** alert channel / rail morph / pin “start live” |

**Good news from v2:** Go to map is mostly **action A**. Operators on Ops can see **where** without instantly fighting the 8-live budget.

**Bad news today:** `showHit()` → `goOpsOnHit(hit)` runs on **every** interrupt hit — that is **auto action A** for all grades.

```text
showHit(hit)
  → goOpsOnHit(hit)          // auto — NEEDS GATE
  → playChime()              // NEEDS tier gate (grade doc)
```

---

## Part C — Map focus gate (locked policy)

### Tier × map behaviour

| Grade | Urgency | Toast / HQ | Auto go-ops | Auto map pan | **Go to map** button |
|-------|---------|------------|-------------|--------------|----------------------|
| `poi` | Silent | No | No | No | No (rail/ledger only) |
| `monitoring` | Low | Optional badge | No | No | No |
| `suspect` | Medium | Amber | **No** (config: off) | **No** | **Yes** — explicit only |
| `blacklist` | High | Red | **Yes** if not on ops surface | **Yes** if GPS + score band | **Yes** |

### Score band (borderline “cheater” band)

Separate **alarm threshold** (emit hit) from **dispatch threshold** (auto map):

| Knob | Default | Meaning |
|------|---------|---------|
| `FM_FR_MATCH_MIN` | 75 | Min % to emit **any** interrupt hit (server) |
| `FM_FR_MAP_AUTO_SCORE_MIN` | **88** | Min % for **auto** map pan + auto go-ops |
| `FM_FR_MAP_AUTO_GRADES` | `blacklist` | Comma list allowed for auto map |

**Example:** 78% `blacklist` → red toast + HQ + ledger, **no auto map**; operator clicks **Go to map** → v2 focus runs.

**Example:** 91% `blacklist` → auto go-ops (if on Analytics) + auto map when GPS present.

### Explicit always wins

| Control | Behaviour |
|---------|-----------|
| Toast / drawer **Go to map** | Always runs `goOpsOnHit({ explicit: true })` — **ignores** score band for pan |
| Already on Ops | v2 skips tab flash — pan in place |
| No GPS | Fleet last-known + toast “Showing last known position” |

### Auto map OFF switches

| Flag | Default | Effect |
|------|---------|--------|
| `FM_FR_AUTO_GO_OPS` | `1` | Master auto tab switch |
| `FM_FR_AUTO_MAP` | `1` | Auto pan on hit (subset of go-ops) |
| `FM_FR_AUTO_MAP_SCORE_MIN` | `88` | Score floor for auto map |
| `FM_FR_AUTO_MAP_GRADES` | `blacklist` | Grades allowed for auto map |

**Ship profile:** can set `FM_FR_AUTO_MAP=0` — dispatchers use **button only** (safest multi-desk).

---

## Part D — 8-BWC live cap · who wins?

### Resource truth (site-wide)

| Resource | Cap | Shared? |
|----------|-----|---------|
| Distinct live pool sessions (`FM_MAX_CONCURRENT_LIVE`) | **8** | **Yes** — all operators + FR + SOS |
| Browser JSMpeg players | Many | Per operator — **same cam can fan-out** |
| FR face probe | `FM_FR_LIVE_SLOTS` / poll union | Shared sidecar |

One operator watching 6 FR tiles + another on Ops with 4 pin lives can **exceed 8 distinct cams** — server already **queues or skips** invites at cap (`server.js`).

### Priority ladder (locked)

```
1. SOS / fall live          — never evicted for FR
2. Blacklist FR hit cam     — may preempt unpinned patrol (not SOS)
3. Ops manual pin / wall    — operator-pinned streams
4. Suspect FR hit           — promote only if slot free; no steal
5. FR patrol rotate         — lowest unpinned slot stolen first
6. Headless FR probe grab   — brief pool touch; release after frame
```

| Priority | Preempt others? | Multi-operator note |
|----------|-----------------|---------------------|
| SOS | **No** — queue at cap | All admins see scoped SOS |
| Blacklist FR live | **Yes** — 1 unpinned patrol / alert promote | **Broadcast** hit; **first Ack** owns audit |
| Map focus only (v2) | **No** | Safe — no pool change |
| Suspect FR | **No** — wait for slot | Amber = investigate, not hijack |
| Pinned tile | **No** without confirm toast | “Pin blocked alert — override?” |

### “Take over” what others are watching?

| Scenario | What happens |
|----------|--------------|
| Hit cam **already live** (on anyone’s grid) | **Reuse** stream — 0 new slots; map focus + rail morph fan-out |
| Hit cam **off-tile**, 7/8 in use | Promote → **7th or 8th** slot; if 8/8 → **queue** or steal **lowest patrol** (not SOS, not pinned) |
| 3 admins, 6+6+4 distinct | **Over budget** — enterprise **warn + queue** (`MOB-DISC-FR-6TILE-MULTI-ADMIN.md`) |
| Operator A on Ops pins 8 cams; blacklist hit | **Do not** silently kill pins — toast: **“Live budget full — tap to replace slot”** |

**Map focus does not require takeover.** Live promote **might** — that is a **separate MOB** from v2.

---

## Part E — Operator SOP (target)

```
1. Hit fires
   ├─ poi/monitoring     → rail + ledger only
   ├─ suspect 78%        → amber toast; operator chooses Go to map
   └─ blacklist 92%      → red + auto Ops (if configured) + auto map if GPS

2. Go to map (explicit or auto)
   → fuchsia pin + popup (v2 PASS)
   → does NOT by itself start live

3. Need live face on catching BWC
   → Alert channel / rail morph / pin Start live
   → pool policy applies (Part D ladder)

4. Ack
   → clear HQ/toast; fade map focus ring after 30s
   → release alert slot back to patrol rotate
```

---

## Part F — MOB plan (order — one at a time)

| # | MOB | Delivers | Risk |
|---|-----|----------|------|
| **1** | **`mob-fr-alert-tier-server`** | `emitHit` gate — poi/monitoring never interrupt | Low |
| **2** | **`mob-fr-go-ops-by-tier`** | Auto `goOpsOnHit` only suspect+blacklist (suspect optional off) | Low |
| **3** | **`mob-fr-map-auto-gate`** | `FM_FR_MAP_AUTO_SCORE_MIN` + grade list; explicit Go to map unchanged | Low |
| **4** | **`mob-fr-chime-by-tier`** | Chime blacklist only; suspect soft | Low |
| **5** | **`mob-fr-live-priority-preempt`** | Hit cam promote steals unpinned patrol; respect SOS + pins | **Med** — pool |
| **6** | **`mob-fr-site-live-budget`** | UI “6/8 live (3 operators)” + queue reason | Med |
| **7** | Later | N-of-M confirm before high tier emit | Engine genre |

**Do not bundle** 1–3 with v2 — v2 PASS stands; gates are **next genre** (`lab-fr-dispatch-trace` extension or `lab-fr-alert-tier`).

---

## Part G — PASS checkpoints (after gates)

| # | Test |
|---|------|
| 1 | `poi` match → rail only — **no** toast, **no** map |
| 2 | `suspect` 80% → amber toast — **no** auto tab; **Go to map** → fuchsia pin |
| 3 | `blacklist` 78% → red toast — **no** auto map; button → map works |
| 4 | `blacklist` 92% on Analytics → auto Ops + map |
| 5 | 8/8 live + blacklist hit off-tile → SOS streams untouched; promote or queue message |
| 6 | Two operators — same hit broadcast; map focus local per desk; pool stays one decode per cam |

---

## FAQ

**Q: Should borderline scores still show on the rail?**  
A: **Yes** — with score % and grade badge. Rail is the **analyst** surface; **map auto-focus** is **dispatch**.

**Q: Does Go to map steal another operator’s video?**  
A: **No** — pan/popup only. **Start live** on that pin follows Part D.

**Q: Is v2 wrong because it auto-fires today?**  
A: v2 fixed **explicit** focus quality. **Auto gate** is the missing policy layer — this DISC.

**Q: Same priority as SOS?**  
A: **No.** SOS > blacklist FR > everything else. FR map ring is **fuchsia**; SOS stays **red**; PTT stays **gold**.

---

## APPLY cheatsheet (when ready)

```text
MOB-APPLY mob-fr-alert-tier-server
MOB-APPLY mob-fr-go-ops-by-tier
MOB-APPLY mob-fr-map-auto-gate
MOB-APPLY mob-fr-live-priority-preempt
```

---

## Bottom line

| Today (post v2 PASS) | Target |
|----------------------|--------|
| Every hit → auto go-ops | **Grade + score gate** auto; button always for dispatch |
| All grades = red panic | Tiered urgency (`MOB-DISC-FR-GRADE-TIERED-ALERT-URGENCY.md`) |
| Map focus feels like “every alert owns Ops” | **Dispatch actions are rare and loud**; rail carries the long tail |
| 8-live is implicit | **Named priority ladder** — map focus cheap; live promote explicit and bounded |

**Your PASS on v2 is the right foundation** — next we **narrow who gets auto dispatch**, and **name who wins the pool** when live is actually needed.
