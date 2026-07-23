# MOB DISC — Pin live without wall: **not WVP-ZLM** · Opera black ~1 min

**Status:** DISC locked (log check 2026-07-16 ~20:24–20:25)  
**Search:** `pin without wall`, `not zlm`, `opera black`, `1 min dead`  
**Operator:** Wall panel not started; pin video running. Are we on WVP-ZLM? No restart. Came back / switched to Opera → black. Mob disc OK for ~1 min dead.

---

## Are we on WVP-ZLM? **NO**

| Proof | Result |
|-------|--------|
| `live broker wvp-zlm primary` | **0** this session |
| What log shows | `wvp_startplay_failure` + `live broker zlm probe idle` + `pool rtp` |
| What you watched on pin | **Fleet FFmpeg / JSMpeg** (pool), not ZLM overlay |

ZLM-before-invite MOB **did run probes** (`zlm probe idle`) — WVP play still **failed**, then pin stayed on pool.

---

## Why wall empty but pin running

| Surface | Behavior now |
|---------|----------------|
| **Wall slot** (numeric) | Tries WVP-ZLM first (`noFfmpegStart`), then FFmpeg |
| **Map pin** (`slotKey === 'map'`) | Still goes **straight to JSMpeg / Fleet INVITE** — **skips** ZLM-first |

So: Open All / wall not used → pin-only live = **FFmpeg path by design today**. That matches “wall panel not started, pin video running.”

**Not** proof of WVP-ZLM.

---

## Opera / leave page → black (~1 min) — Mob disc OK

Log end:

```text
20:25:42 stop-video … remainingViewers:0  (…0008)
20:25:43 stop-video … remainingViewers:0  (…0009)
pool stream stopped
```

Switching browser / Opera tab / leaving ops → dashboard viewers hit **0** → Fleet **stops** pool. Pin goes black.  
Treat as **viewer/refcount stop**, not a separate ZLM mystery. (~1 min dead = OK per operator for this disc.)

---

## Still not ZLM — root (same as before, honest)

WVP `startPlay` still failing (timeout / ssrc-class errors in WVP logs).  
Probing first does not fix a dead WVP play. Pin-only never waited for ZLM success before invite.

**5060 stays** — no dictate.

---

## Next code (paper — needs MOB-APPLY)

**`mob-wvp-pin-zlm-before-ffmpeg-invite-v1`** — **APPLIED** 2026-07-16 — see `docs/MOB-APPLIED-WVP-PIN-ZLM-BEFORE-FFMPEG-INVITE-V1.md`.

---

## One line

**Pin was FFmpeg, not WVP-ZLM. Wall ZLM-first does not cover pin-only. Opera leave → viewers 0 → black. Next: pin ZLM-first MOB.**
