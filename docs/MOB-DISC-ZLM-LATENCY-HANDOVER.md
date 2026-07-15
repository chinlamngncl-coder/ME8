# MOB DISC — ZLM / live latency (handover — must solve)

**Status:** ACTIVE talk — **no code yet**  
**Date:** 2026-07-14  
**Trigger:** `MOB DISC zlm latency` — near handover, latency **must** be fixed  
**Search:** `zlm latency`, `handover live speed`, `no osd phone`

---

## Operator rule (life and death)

**You are not the measuring tool.**

- Do **not** ask you (or the client) to “put OSD on the video” / “time with a phone” / “write seconds in a doc.”
- **Agent owns:** prove delay from lab evidence (server logs, stream timestamps, side-by-side capture if needed, automated check).
- **You only:** restart / refresh once / say **PASS or FAIL** from what you see on screen.

If a plan dumps homework on the operator or customer, that plan is **wrong**. Rewrite it.

---

## Plain goal (handover)

Live on **our** Fleet screen for the scale path must feel close to **WVP’s own Play** — not “connected but late.”

| Where | Today | Handover |
|-------|--------|----------|
| WVP website Play | Felt fast | Reference |
| Ops wall (Track A) | ~2s class | Keep working — do not break Open All |
| Lab / scale tiles (Track B: WVP→proxy→mpegts) | Picture OK, **feels slow** | **Must fix** |

Two tiles = picture PASS. Latency = **not** PASS.

---

## Why slow (short)

WVP UI: short path to the browser.  
Our tile: extra Fleet proxy + mpegts. Extra hops = delay.

Ops wall is a **different** path (FFmpeg). Fine for 8-cam delay; **not** the many-viewer solution.

---

## Forbidden retries

| Bad idea | Why |
|----------|-----|
| mpegts `liveBufferLatencyChasing` / stash-off | Already caused **minutes** lag — **never again** |
| Stuff ZLM into pool FFmpeg / Open All | Broke wall once — **never again** |
| “Client should add OSD / follow a measure doc” | **Forbidden** — agent owns prove |
| 172.x as server IP | Forbidden |

---

## How we fix (agent work — one MOB at a time)

Handover order for **Track B tiles** (already have working picture):

1. **`mob-wvp-tile-direct-flv`** — **APPLIED** 2026-07-14: prefer direct ZLM FLV (lab CORS OK); Fleet proxy auto-fallback. Still no chase knobs.
2. **`mob-wvp-tile-ws-flv`** (or fmp4-class player) — if direct still feels slow.
3. Only if still slow: stream settings (GOP / keyframe) on WVP/lab — agent changes + agent verifies.

Track A “make wall as short as WVP” stays a **separate** later MOB family — never merge into Open All first.

---

## Ship bar (for us — not a client worksheet)

Agent must show (or you say FAIL from watching):

- Scale / lab tile delay **clearly better than today’s “many seconds late”**
- Prefer **near WVP Play feel**; refuse to call handover “live ready” while it still feels like the old ~8–10s class
- Ops wall Open All still OK after each APPLY

No customer PDF that says “measure with phone.”

---

## What you say next

| You say | I do |
|---------|------|
| `MOB-APPLY mob-wvp-tile-direct-flv` | First speed try — cut hop |
| `MOB-APPLY mob-wvp-tile-ws-flv` | Alternate play path |
| **go ahead** on one named line | That MOB only |

---

## Related

- Old park → resumed: `docs/MOB-DISC-ZLM-OPTION-B-PROXY-DESIGN.md`  
- Fast-as-WVP (separate wall track): `docs/MOB-DISC-WVP-TOP-SPEED-VS-WALL.md`  
- Picture PASS (not speed): `docs/MOB-DISC-TRACK-B1-WVP-TILE-PASS.md`
