# MOB DISC — FR 6-tile grid · multi super-admin Analytics (enterprise)

**Status:** DISC 2026-07-11 — **no APPLY**  
**Trigger:** (1) **6 tiles** instead of 8? (2) **2–3 super admins** on Analytics at once — same or different cams — enterprise?  
**Search:** 6 tile, multi admin, concurrent analytics, cross video, live cap, fr-watch-slots  
**Related:** `MOB-DISC-FR-8TILE-SET-ROTATE.md`, `MOB-DISC-FR-WATCH-ROSTER-ENTERPRISE.md`, `MOB-DISC-FR-OPENALL-OVERLAP-OFFLINE-PIN.md`

---

## Part A — 6 tiles vs 8 tiles (honest)

### Your idea

Smaller BWC video → dense grid, not 4 cinema screens.  
**6 boxes** may be the **sweet spot** between coverage and fleet SOP.

### Math — 32 BWCs in watch set

| Layout | Sets × tiles | Cycle @ 20s/set | Live cap use |
|--------|--------------|-----------------|--------------|
| 4 big (today) | staggered 4 | uneven | **4/8** |
| **6 small** | **6 sets × 6** (+ last set 2) | **~120s** full | **6/8** |
| 8 small | 4 sets × 8 | **80s** full | **8/8** (no headroom) |

**6 tiles:** 5×6 = 30, plus **2** in set 6 — or rotate **6 cams every 20s** through 32 → **⌈32/6⌉ = 6 sets** → **120s** cycle.

**8 tiles:** faster full roster (**80s**) but **zero** live slots left on default cap.

### Resource comparison (lab defaults)

| Resource | 4 tiles | **6 tiles** | 8 tiles |
|----------|---------|-------------|---------|
| Pool ffmpeg | 4 | **6** | 8 |
| `FM_MAX_CONCURRENT_LIVE=8` headroom | 4 free | **2 free** | 0 |
| FR probes/tick (serial) | 4×3 grabs | **6×3** | 8×3 |
| Browser JSMpeg | 4 large | **6 small** | 8 small |
| Ops + FR same time | Easy | **Possible** (2 slots) | Hard |
| 32-cam cycle | Slow/uneven | **120s** | **80s** |

### Recommendation — **6 is the better default for enterprise**

| | Verdict |
|--|---------|
| **6 tiles** | **Recommended** — fits BWC pixel size, leaves **2 live** for SOS/map, **50%** probe increase vs today (manageable after grab/engine MOBs) |
| **8 tiles** | **Bench / max-FR mode** only — or raise cap to **12** on dedicated FR servers |
| **4 tiles** | Legacy / low-spec |

**Config sketch:**

```env
FM_FR_LIVE_SLOTS=6
FM_FR_ROTATE_SET_SIZE=6
FM_FR_ROTATE_MS=20000
# 32 watch → 6 sets (last set partial)
```

**MOB:** `mob-fr-6tile-set-rotate` (UI 3×2 grid + set rotation) — prefer over 8-tile unless bench proves headroom.

---

## Part B — 2–3 super admins on Analytics (today vs enterprise)

### Short answer

| Question | Answer |
|----------|--------|
| Can 2–3 super admins log in and use Analytics? | **Yes** — separate sessions, separate sockets |
| Same as last time (video + SOS safe)? | **Mostly yes for video/SOS** — see table below |
| Each admin different cameras? | **Video: yes.** **FR face poll: not fully** today |
| Cross / overlap same camera? | **Yes** — one pool stream, multiple viewers (efficient) |
| Enterprise-grade today? | **Partial** — needs poll union + budget MOBs |

---

## What works today (code truth)

### Independent sessions

- Each browser login → own `fm_session` + socket.id  
- Fleet roster **filtered per user** (`dispatchScope` — super admin = all groups)  
- On disconnect: `frLivePoller.clearWatch(socket.id)` + `liveViewers.releaseSocket` ✓  

### Live video — **multi-admin safe**

```
Admin A ──WS──┐
Admin B ──WS──┼──► one ffmpeg pool session per cam ◄── SIP/BWC
Admin C ──WS──┘         (fan-out)
```

| Behaviour | Safe? |
|-----------|-------|
| 3 admins watch **same** cam | **Yes** — 1 decode, 3 WS clients |
| 3 admins watch **different** cams | **Yes** — N pool streams, shared **global 8 cap** |
| SOS + live | Per-session SOS filter; pool ref-count ✓ (prior soak) |

### FR watch registration — **per admin**

`fr-watch-slots` stored in `watchBySocket` **per socket.id** — each admin sends their own cam list + threshold.

### FR face poll — **NOT multi-admin safe yet**

`collectProbeCams()` in `frLivePoller.js`:

1. **Unions** all sockets’ watch lists  
2. **Hard caps at `LIVE_SLOTS` (4)** — only **4 cams** probed site-wide  
3. Admin A watching cams 1–4 + Admin B watching 5–8 → **only 4 get face scan** (lowest threshold wins per cam)

**Also:** `fr-crop-tick` and `fr-blacklist-hit` broadcast via `emitToDashboardSockets` to **every** dashboard that `sessionCanSeeCam` — all admins see **same** rail events (correct for SOC alarm; **not** per-user private rails).

---

## Enterprise model (how serious vendors do it)

### Layer 1 — Site resources (shared)

| Resource | Policy |
|----------|--------|
| Distinct live cams | **Union** across all dashboards ≤ `FM_MAX_CONCURRENT_LIVE` |
| SIP / pool ffmpeg | One per distinct cam (already) |
| FR sidecar | **One** process — shared embed queue |
| Watchlist gallery | **One** site gallery |

### Layer 2 — Per operator session (isolated)

| Item | Per user |
|------|----------|
| Watch roster selection | ✓ own 32-cap set |
| Threshold slider | ✓ own value (min wins for poll on shared cam) |
| Live tiles on screen | ✓ own 6 (or 4) decodes |
| Snapshot rail UI | **Today:** shared events · **Enterprise option:** filter to *my watch set* |
| Alarm popup | Shared hit — **audit** who Acked (`fr-alarm-ack` already logs actor) |

### Layer 3 — Super admin concurrent scenarios

| Scenario | Enterprise behaviour |
|----------|---------------------|
| **A** — 3 admins, **disjoint** cams (Alpha / Bravo / Charlie groups) | **Target:** union poll up to **6–8** distinct cams; each sees own tiles + relevant snaps |
| **B** — 2 admins, **overlap** same 2 cams | 2 pool streams, 4 WS clients; **1** poll per cam (dedupe) |
| **C** — 1 admin FR 6-tile + 1 admin Ops map live | **6+2 ≤ 8** — fits default cap |
| **D** — 3 admins each want 6 tiles different | 18 distinct cams — **exceeds 8** — **must queue or warn** |

**Enterprise rule:** show **Live budget: 6/8 used (3 operators)** in Centre Summary / FR toolbar.

---

## Gap list (today → enterprise)

| Gap | Severity | MOB |
|-----|----------|-----|
| Poll cap **4** with multi-socket union | **High** | `mob-fr-multi-admin-poll-union` — raise to `FM_FR_POLL_MAX=6`, union **distinct** cams across sockets |
| No live budget UI | Med | `mob-fr-site-live-budget` — distinct cams across admins vs cap |
| Crop rail shared broadcast | Low–Med | `mob-fr-crop-tick-scope` — optional filter: only cams in my watch |
| 6-tile grid | UX | `mob-fr-6tile-set-rotate` |
| Grab/engine speed | **Blocker** for smooth 6-probe | capture + primary engine genre |

---

## Recommended architecture (`mob-fr-multi-admin-poll-union`)

```javascript
// collectProbeCams() — target logic
// 1. Union distinct camIds from all watchBySocket entries
// 2. Add analytics-fr live viewers not in watch (keep today)
// 3. Sort by fairness (longest since last probe)
// 4. Slice(0, FM_FR_POLL_MAX)  // default 6, not 4
// 5. Per-cam threshold = min threshold among sockets watching that cam
```

**Emit:**

| Event | Enterprise default |
|-------|-------------------|
| `fr-blacklist-hit` | **Broadcast** (HQ + all FR desks) |
| `fr-crop-tick` | Broadcast with camId; client **filters** to watch set |
| `fr-alarm-acked` | Broadcast — show who acked |

---

## Capacity example — 3 super admins

**Assumption:** `FM_MAX_CONCURRENT_LIVE=8`, `FM_FR_LIVE_SLOTS=6`, fast primary engine.

| Admin | Watch set | Live tiles | Distinct cams |
|-------|-----------|------------|---------------|
| SA-1 | Alpha (6 online) | 6 | 6 |
| SA-2 | Bravo (6 online) | 6 | 6 |
| SA-3 | Charlie (4 online) | 4 | 4 |

**Distinct union:** up to **16** — **over cap**.

**Enterprise handling (pick one at APPLY):**

| Mode | Behaviour |
|------|-----------|
| **Warn** | Allow start; show amber “Live budget exceeded — some streams may not start” |
| **Queue** | First-come 8 distinct; others snapshot-only |
| **Coordinator** | Super-admin “site watch profile” — one shared 6-tile set (optional MOB) |

**Realistic SOC:** 3 admins rarely each run **6 live** — often **2+2+2 = 6** or overlap — **fits 8 cap**.

---

## SOS / video — still safe?

| Area | Multi-admin |
|------|-------------|
| SOS queue | Filtered per `dispatchScope` ✓ |
| Pool ref-count | Per socket + surface ✓ |
| PTT / voice | Separate socket state ✓ |
| Same cam dual surface (FR + ops) | Supported ✓ |
| 8 live ceiling | **Shared** — FR 6-tile + Ops 4 pin = conflict |

**Your memory is correct** for video/SOS ref-counting. **New stress** is **FR poll union + 6–8 live** when several admins run Analytics together.

---

## Phased MOBs

| # | MOB | Genre |
|---|-----|-------|
| 1 | `mob-fr-capture-grab-tune` + engine bench | Speed |
| 2 | `mob-fr-6tile-set-rotate` | 6-tile UI + set rotation |
| 3 | `mob-fr-multi-admin-poll-union` | `FM_FR_POLL_MAX=6`, fair union |
| 4 | `mob-fr-site-live-budget` | Distinct cam counter in UI |
| 5 | `mob-fr-crop-tick-scope` (optional) | Client filter rail to my watch |

**Do not** bundle 2+3+4 in one APPLY.

---

## Bottom line

| Question | Answer |
|----------|--------|
| **6 or 8 tiles?** | **6 default** — leaves 2/8 live for SOS/Ops; 120s full 32 cycle; smoother ops than 8 |
| **2–3 super admins on Analytics?** | **Yes, possible** — sessions independent; video shared efficiently |
| **Different cameras each?** | **Video yes**; **face poll needs** `mob-fr-multi-admin-poll-union` |
| **Same cam overlap?** | **Yes** — best case (one decode) |
| **Enterprise?** | **Poll union + live budget UI + 6-tile + fast engine** — not just more checkboxes |

---

## APPLY (when you say)

```text
MOB-APPLY mob-fr-6tile-set-rotate
MOB-APPLY mob-fr-multi-admin-poll-union
MOB-APPLY mob-fr-site-live-budget
```

Start with **`mob-fr-6tile-set-rotate`** for layout; **`mob-fr-multi-admin-poll-union`** before relying on 3 concurrent FR desks in production.
