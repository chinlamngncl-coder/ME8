# MOB DISC — WVP tile stability (latency OK, Tile B dies ~5 min)

**Status:** ACTIVE — **latency PASS**; stability **prove pending** after auto-reopen  
**Date:** 2026-07-14 (updated after nomute-stall test)  
**Search:** `tile B dead 5 min`, `low latency`, `Opera private`, `auto-reopen`

---

## What you reported (latest)

| Item | Result |
|------|--------|
| Latency | **Good** — both tiles felt fast (direct FLV + nomute-stall helped) |
| Tile A | **OK** in this run |
| Tile B | **Dead ~5 minutes** in (cam still called / still on video on BWC side) |
| Browser | Opera **private/incognito** |

So: **speed problem largely solved for lab tiles.**  
**Remaining bug:** one tile can still drop while the cam keeps streaming.

---

## What that means (plain)

Not “WVP is slow again.”  
Not “both tiles broken.”  
It is: **Tile B’s browser player lost the stream** (or stopped reading it) while the bodycam session stayed up.

Same class as before: **player-side death**, not BWC hang-up.

---

## What already APPLIED (keep)

| MOB | Role |
|-----|------|
| `mob-wvp-flv-token-live` | Proxy token no longer 3‑min kill |
| `mob-wvp-tile-direct-flv` | Prefer ZLM direct (latency win) |
| `mob-wvp-tile-nomute-stall` | Opera/Chromium stall class — **latency PASS** |
| `mob-wvp-tile-auto-reopen` | Silent re-Play when tile errors / freezes (~22s) |

Do **not** revert these for stability work.

---

## Next prove (auto-reopen APPLIED)

**Reopen is a lab safety net, not “stable.”** Honest disc: `docs/MOB-DISC-WVP-REOPEN-IS-PATCH-NOT-STABLE.md`

Hard refresh → Play A + B → leave **> 10 min**.  
Both still picture without **constant** reopen blink = soak **PASS**.  
Reopen every few min or tile stays dead = **FAIL** → root player/path MOB next (not more reopen).

---

## Why Tile B only / ~5 min (before auto-reopen)

1. ~~**No auto-reopen**~~ — **APPLIED** `mob-wvp-tile-auto-reopen`
2. **Second-stream edge** — WVP/ZLM or one BWC weaker on the **second** concurrent Play (Tile B cam / chin vs kk). One tile survives, one dies later.
3. **Opera private timer** — background/tab throttling can hit one `<video>` harder when two run; keepalive helped 1–2 min class, not guaranteed forever.
4. **Not** the old 3‑min proxy token (fixed; death now ~5 min).

Agent verifies which in logs — **you do not.**

---

## If still FAIL after auto-reopen

**`mob-wvp-play-retry-once`** — start Play timeout class (kk).  
Then agent-owned ZLM desk tune — not operator homework.

---

## Pass rule (stability genre)

Opera private OK. Play A + B. Leave **> 10 min** without touching.  
**Both** tiles still show picture = stability **PASS**.  
Either dies while cams still live = **FAIL** → next MOB or desk ZLM tune (agent-owned).

Latency: already **PASS** for this lab path — do not reopen buffer-chase MOBs.

---

## Forbidden

- Phone / OSD / client measure docs  
- `liveBufferLatencyChasing`  
- Open All / pool FFmpeg  
- Declaring handover live-ready while one tile dies at 5 min  

---

## Related

- Latency handover: `docs/MOB-DISC-ZLM-LATENCY-HANDOVER.md`  
- Where to click: `docs/MOB-DISC-WVP-TILE-WHERE-TO-PLAY.md`  
- APPLIED: `MOB-APPLIED-WVP-TILE-NOMUTE-STALL.md`, `MOB-APPLIED-WVP-FLV-TOKEN-LIVE.md`
