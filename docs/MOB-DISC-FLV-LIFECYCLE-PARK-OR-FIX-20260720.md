# MOB DISC — FLV lifecycle parity: do it, park handoff, or give up?

**Date:** 2026-07-20  
**Status:** DISC only — no code  
**Question:** Health/stop/stall built for Fleet canvas, never ported to FLV `<video>`. **Then what? Can we? Should we? Park or give up?**

---

## Short answer

| Option | Verdict |
|--------|---------|
| **Give up on ME8 / Fleet** | **No** — product is salvageable. |
| **Keep WVP handoff and ignore lifecycle** | **No** — that’s the broken hybrid you feel now (~80% “performance functions”). |
| **Park WVP handoff, run Fleet canvas only** | **Valid lab choice** — lifecycle works again; lose WVP wall picture until parity exists. |
| **One MOB genre: FLV wall lifecycle parity** | **Yes — can do, should do** if handoff stays on. **Not another patch storm** — one named APPLY, one operator PASS. |

**Do not park lifecycle forever.** Either **port it to FLV** or **turn handoff off** until ported. Parking “dead overlays” while handoff stays on = permanent broken feel.

---

## What’s actually broken (not deleted)

Code + CSS still there. These functions **return early** when wall has `<video>` not `canvas`:

| Function | Role | FLV today |
|----------|------|-----------|
| `camHasActiveLiveVideoSurface` | Stall watch input | ❌ false → watch exits |
| `ensureBwcStallWatch` → `markBwcStoppedOverlay` | Stopped by BWC | ❌ no wall overlay |
| `markVideoSignalLost` | Signal lost chrome | ❌ no wall overlay |
| `video-stream-stopped` `device_bye` | BWC ended live | ❌ wall may stay “Live” |
| Pin mirror / stopped on pin | Uses canvas/mirror canvas | ⚠ partial |

Jul-18 **worked** because wall = JSMpeg **canvas**. Handoff swapped player to **`video.me8-zlm-primary`** without updating these gates.

---

## Can we do it?

**Yes.** Scope is **bounded** — mostly `public/js/video-wall.js` (+ small hook in `live-player-factory.js`).

### Technical approach (one MOB, not ten patches)

1. **Single helper** — e.g. `wallLiveMediaForStage(stage)` → `{ kind: 'canvas'|'video', el }` (canvas **or** `video.me8-zlm-primary`).
2. **Replace ~15 `querySelector('canvas')` wall gates** in stop/stall/signal-lost with that helper.
3. **Stall watch** — `noteVideoFrame(camId)` already runs on FLV `onProven`; add **`timeupdate`** on FLV video (via factory callback) so frames keep ticking during live (same as JSMpeg decode callback).
4. **detachWallPlayerKeepCanvas** — destroy FLV handle (`player.destroy()`) when stopping, not only JSMpeg.
5. **Pin** — same helper for mirror source (partially done); stopped/signal overlays on pin mirror canvas when wall is FLV.
6. **No server change** for lifecycle chrome — UI-only genre.

### What it does **not** fix (separate MOBs)

- Pin picture race / layout jump / auto-pin storm  
- PTT 29201 login when WVP-homed  
- PTT GROUPS 2+ select logic  

---

## Should we do it?

**If `FM_WVP_VIDEO_HANDOFF=1` stays the video path → yes, should.**  
Otherwise operators run wall video with **no** Stopped by BWC, **no** signal lost, **no** stall→stop — enterprise-unacceptable even if picture paints.

**If you’d rather lab on classic Fleet INVITE + canvas until WVP is “whole” → park handoff** (`FM_WVP_VIDEO_HANDOFF=0`), restore Jul-18 video behavior, **defer parity MOB**. Honest floor; no fake “half handoff.”

| Strategy | Wall video | Lifecycle chrome | WVP work |
|----------|------------|------------------|----------|
| **A. MOB lifecycle parity** (recommended if handoff on) | WVP FLV | Restored | Kept |
| **B. Park handoff** | Fleet JSMpeg | Works now | Parked |
| **C. Nothing** | WVP FLV | Broken | Stuck |

**Recommendation: A**, not give up. One APPLY, one PASS checkpoint, then pin/layout MOBs.

---

## Operator PASS for lifecycle MOB (when applied)

1. Handoff on, wall Live on Chin.  
2. BWC stops live (device button) → wall + pin show **Stopped by BWC**, not frozen “Live”.  
3. Kill stream / long stall → **Video signal lost** (or stall→stopped per policy).  
4. Operator Stop still works.  
5. No regression on classic if handoff off (canvas path unchanged).

---

## Named MOB (when you say APPLY — one only)

**`MOB-APPLY-FLV-WALL-LIFECYCLE-PARITY-V1`**

- Files: `public/js/video-wall.js`, `public/js/live-player-factory.js` (frame tick callback only).  
- **No** bundle with pin storm, PTT select, panel sizing.  
- Cache bust after PASS.

---

## Park vs give up — plain language

- **Park lifecycle** while handoff on = **accept broken product** — that’s the “fucking give up” path in disguise.  
- **Park handoff** = **temporary retreat** to Fleet canvas — **not** giving up on WVP; parity MOB later.  
- **Apply lifecycle parity** = **finish the handoff split properly** — WVP video only, Fleet behavior on wall **semantics** (stop/stall/signal).

---

## One line

**Can do it. Should do it if handoff stays on.** Alternative is **park handoff** (Fleet canvas), not park lifecycle. **Don’t give up** — pick **one MOB genre** (`FLV-WALL-LIFECYCLE-PARITY-V1`) or **turn handoff off** until that MOB ships; running handoff without it is the systemic bug.
