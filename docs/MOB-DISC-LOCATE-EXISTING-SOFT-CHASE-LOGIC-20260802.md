# MOB DISC — Locate existing soft-chase logic (search only)

**Subject:** `MOB-LOCATE-EXISTING-SOFT-CHASE-LOGIC`  
**Date:** 2026-08-02  
**Mode:** SEARCH ONLY — no code written, no APPLY suggested here beyond locate facts  
**Status:** LOCATED

---

## Search criteria used

- DOM property: `playbackRate`
- Soft rate floats: `1.05` and normalize `1.0` / `1`
- Buffer math: `video.buffered` end vs `video.currentTime`
- Frontend JS under `public/js`

---

## Result (exact locations)

### 1) Original / older soft-chase (lab tiles) — STILL IN TREE

**File:** `public/js/wvp-lab-tile.js`  
**MOB name in file header:** `mob-wvp-lab-mpegts-live-chase`

| What | Lines |
|------|-------|
| Soft band comment (`buffered.end - currentTime`) | **22** |
| Soft threshold `CHASE_SOFT_SEC = 1.5` | **23** |
| Soft rate `CHASE_SOFT_RATE = 1.12` (not 1.05) | **24** |
| Hard snap threshold `CHASE_HARD_SEC = 10` | **25** |
| Tick interval `CHASE_TICK_MS = 1000` | **26** |
| `bufferDelaySec` — `buffered.end` − `currentTime` | **77–87** |
| `chaseLiveEdge` — hard seek / soft rate / normalize | **90–122** |
| Hard: set `currentTime` near live edge | **97–100** |
| Hard: `playbackRate = 1` | **101** |
| Soft: `playbackRate = CHASE_SOFT_RATE` (1.12) | **109–111** |
| Normalize: `playbackRate = 1` | **120** |
| `armLiveChase` interval | **124–134** |
| Armed after attach | **318** |

**Note:** Lab soft rate is **1.12**, not **1.05**. Normalize is **`1`** (same as 1.0).

---

### 2) Tonight’s Axiom soft-chase (all panels) — ALSO IN TREE

**File:** `public/js/shared-flv-player.js`  
**Symbol:** `AxiomFlvManager` / `softChaseTick`

| What | Lines |
|------|-------|
| Soft on `CHASE_SOFT_ON = 0.5` | **10** |
| Soft off `CHASE_SOFT_OFF = 0.2` | **11** |
| Soft rate `CHASE_SOFT_RATE = 1.05` ← **this is the 1.05** | **12** |
| Hard `CHASE_HARD_SEC = 2.0` | **13** |
| `bufferDelaySec` — `buffered.end` − `currentTime` | **93–103** |
| `softChaseTick` body | **105–126** |
| Hard: `currentTime` + `playbackRate = 1` | **112–115** |
| Soft: `playbackRate = CHASE_SOFT_RATE` (1.05) | **118–119** |
| Normalize: `playbackRate = 1` | **122–123** |
| `armChase` interval | **128–133** |

**Wired through:** `public/js/live-player-factory.js` → `axiomAttach` / `attachFlvPrimary` (calls `AxiomFlvManager.attach`; chase lives in shared-flv-player, not as local math in the factory).

---

### 3) What the July wall MOB said — vs what is in the file NOW

**Applied disc:** `docs/MOB-APPLIED-WALL-SOFT-ZLM-LIVE-CHASE-V1.md`  
Said soft chase was ported into **`public/js/live-player-factory.js`** (`softAttachZlmOverlay`) with **1.12× / 1.5s / 10s**.

**Current working tree fact:**

- `public/js/live-player-factory.js` — **no** `playbackRate`, **no** `CHASE_*`, **no** `bufferDelaySec` / `chaseLiveEdge` math today.
- `softAttachZlmOverlay` (around **102–205**) now attaches via `AxiomFlvManager` only.
- `public/js/video-wall.js` — **no** `playbackRate` / chase math.

So the **wall soft-chase MOB math is no longer living as local logic in `live-player-factory.js`**. The only **`playbackRate` adjustment logic still present** is:

1. **`wvp-lab-tile.js`** (original lab soft chase, **1.12**)  
2. **`shared-flv-player.js`** (Axiom soft chase, **1.05** — the float you named)

---

## Straight answer to “you fucked up / we did something”

You are right that soft-chase **already existed**. It was not invented from nothing tonight.

- **First home (still there):** `wvp-lab-tile.js` — `chaseLiveEdge` / `armLiveChase`  
- **Wall port (MOB `mob-wall-soft-zlm-live-chase-v1`):** was applied into `live-player-factory.js` per disc; **that local math is gone from the factory file now**  
- **Tonight:** same pattern of math was put into `shared-flv-player.js` with **tighter** numbers (`0.5s` / `1.05` / hard `2s`) and wired to **all** FLV panels

`1.05` lives only in **`shared-flv-player.js` line 12** (used at **119**).  
`1.0` normalize is written as **`playbackRate = 1`** at **`wvp-lab-tile.js` 101, 120** and **`shared-flv-player.js` 115, 123**.

---

## Verify checklist (for you)

Open these two files and jump to the lines above. If you only care about the **1.05** soft rate: that is **`shared-flv-player.js`**. If you care about the **older written soft catch**: that is **`wvp-lab-tile.js`** at **1.12**.
