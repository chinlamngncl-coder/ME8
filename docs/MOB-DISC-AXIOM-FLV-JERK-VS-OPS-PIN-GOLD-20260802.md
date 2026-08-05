# MOB DISC — Video jerking after AxiomFlvManager (2026-08-02)

**Status:** DISCUSS ONLY — wait for `MOB-APPLY …`  
**Operator:** Live video not smooth / jerking on panels. Asks: did we do this to all players? What was original Ops + pin?

---

## Plain English

Yes — the jerk is almost certainly from **AxiomFlvManager soft-chase**, and yes it hits **every panel that uses `Me8LivePlayerFactory.attachFlvPrimary`**:

Ops wall · FR · ANPR · Tactical · Command Wall  

That factory was rewritten to call `AxiomFlvManager.attach()`. Soft-chase runs **every 1s** on each `<video>`:

| Rule (current) | Effect |
|----------------|--------|
| buffer delay &gt; **0.5s** → `playbackRate = 1.05` | constant speed-up / slow-down → **jerk** |
| delay ≤ **0.2s** → rate 1.0 | flip-flops with the above |
| delay &gt; **2.0s** → `currentTime` seek | visible jump / hitch |

Also set: `enableStashBuffer: false` (more sensitive to network jitter).

**Hard `liveBufferLatencyChasing` is still OFF** (correct — that caused minutes lag before). Soft-chase thresholds from the “unified engine” paste were **too aggressive** for Ops/pin.

---

## Original Ops video panel (before Axiom)

| Fact | Detail |
|------|--------|
| Path | `video-wall.js` → `Me8LivePlayerFactory.attachFlvPrimary` |
| Player | mpegts FLV, `isLive: true`, `hasAudio: false` |
| Latency | `liveBufferLatencyChasing: **false**` |
| Soft chase | **None** on Ops/factory (smooth; could drift slowly) |
| Lab only | `wvp-lab-tile.js` had soft chase with **gentler** bands (~1.5s soft / ~10s hard) — not the 0.5s/2s Axiom defaults |

ZLM latency was already **PASS** as wall experience; parked rule: do not reopen hard mpegts chase.

---

## Original pin (Firmware Gold — locked)

| Fact | Detail |
|------|--------|
| Rule | **One stream owner** = wall. Pin does **not** open a second FLV/JSMpeg. |
| Paint | `startMapMirrorFromWall` — **canvas mirror** (or mirror wall `<video>`) |
| Cache / lock | Firmware Gold `?v=20260705-pin-mirror-complete` |
| Forbidden | Dual pin player, strip `map-pin-mirror-canvas`, blind `mapPlayers.has` guards |

So: if Ops wall `<video>` jerks from soft-chase, **pin mirror jerks too**. Fix wall smoothness; do **not** invent a second pin player.

Docs: `MOB-DISC-FIRMWARE-GOLD-PIN-MIRROR.md`, `ME8-FIRMWARE-GOLD-LOCKED.md`.

---

## What we must not do

- Turn hard `liveBufferLatencyChasing` back on  
- Rewrite pin / dual JSMpeg  
- Another full architecture rewrite  
- Leave aggressive 0.5s/2s chase on Ops/CW/FR  

---

## Risk pick (one recommendation)

| Option | Verdict |
|--------|---------|
| **A. Soft-chase OFF by default** on `AxiomFlvManager` (attach/detach/hygiene stay). Optional gentle chase only if env/opt `softChase: true` (lab). Restore stash closer to pre-Axiom. | **RECOMMENDED** |
| B. Keep chase but widen to lab bands (1.5s / 10s) | Partial — may still hitch on Ops |
| C. Rip out AxiomFlvManager entirely | Overkill; attach path is fine without chase |

### `AXIOM-FLV-SOFT-CHASE-OFF-SMOOTH-V1`

**Scope (tiny):**

1. `shared-flv-player.js` — default `softChase: false` (no rate flip / no 2s seek loop).  
2. Keep `enableStashBuffer` / player opts closer to pre-Axiom factory (smooth first).  
3. Do **not** touch `video-wall.js` pin mirror / Firmware Gold.  
4. Do **not** touch ANPR OCR / enhance_plate_crop.

**PASS:** Ops + pin + CW look smooth again (no 1s hitch). Drift of a few seconds OK until a later gentle chase MOB.

---

## Operator next

Say: **`MOB-APPLY AXIOM-FLV-SOFT-CHASE-OFF-SMOOTH-V1`**
