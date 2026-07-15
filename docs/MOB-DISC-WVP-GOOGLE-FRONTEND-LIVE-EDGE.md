# MOB DISC — Google frontend live-edge advice (share knowledge, not gospel)

**Date:** 2026-07-15  
**Status:** DISCUSSION only — **no APPLY**  
**Tone:** We share notes with Google-style tips. Take what fits ME8; reject what already burned us. Goal = **best product**, not “follow the paste.”  
**Paste theme:** Backend fine → aggressive **frontend** buffer management to stay at live edge; Jessibuca / flv.js jump / mute audio

---

## Shared bottom line (ours + theirs)

| Agree together | Our lab evidence |
|----------------|------------------|
| Creep often = **player buffer debt**, not “cam always 30 s slow” | Drag to bar end → hand ~**2–3 s** |
| Need something that **forces live edge** | Today chase is **off**; you babysit the bar |
| Audio sync can worsen browser delay | Lab tiles already **`hasAudio: false`** |

So the **objective** in the paste (“frontend stay at live edge”) matches what we already named: **`mob-wvp-lab-live-edge-nudge`**. Worth keeping on the roadmap.

---

## What we actually play today (facts)

Lab Track B tiles = **mpegts.js** + FLV (ws/http), **not** Jessibuca, **not** stock flv.js, **not** WebRTC `<video>` only.

Already set:

| Setting | Today |
|---------|--------|
| `hasAudio` | **false** |
| `enableStashBuffer` | **false** |
| `stashInitialSize` | **128** |
| `liveBufferLatencyChasing` | **false** (deliberate) |

Google’s “disable audio” for monitoring tiles = **largely already done** on Lab. Remaining creep ⇒ **not** solved by audio alone here.

---

## Score each Google block

### 1) Objective — frontend aggressive buffer / live edge

| | |
|--|--|
| **Take** | Yes — this is the right *class* of fix for **bar creep** |
| **Caveat** | “Backend (ZLM) is fine” is **overclaim** for us — stamp spam + optional `modify_stamp` still on the table; two lanes |
| **ME8** | Do live-edge **without** re-running Gate B’s bad chasing recipe |

### 2) Jessibuca (`videoBuffer: 0.2`, WCS/MSE, no audio)

| | |
|--|--|
| **Take** | Industry fit next to WVP UI; small buffer is the right *idea* |
| **Cost** | New vendor, new bugs, wall/pin/OEM brand surface — **big product MOB**, not a 20-minute knob |
| **When** | After Lab mpegts live-edge PASS, or if mpegts never holds scale — separate genre `mob-wvp-lab-jessibuca` (named later) |
| **Now** | **Do not** jump to Jessibuca to “fix drag bar” |

### 3) flv.js timer: every 2 s, if `buffered.end - currentTime > 3` → seek end

| | |
|--|--|
| **Take** | **Strong** — same physics as your drag; automates it |
| **Map** | mpegts attaches to `<video>` — same API: `video.buffered` / `video.currentTime` |
| **Caveat** | Blind `currentTime = end` every 2 s can **hitch**; need throttle, only when `diff > N`, maybe leave 0.2–0.5 s headroom |
| **Gate B scar** | Built-in `liveBufferLatencyChasing` + stash games → **minutes lag** once — treat paste’s interval seek as **our controlled nudge**, not copy-paste chasing flags |
| **Named** | Already planned: `mob-wvp-lab-live-edge-nudge` |

### 4) WebRTC / mute / disablePiP

| | |
|--|--|
| **Take** | Mute helps autoplay + can reduce A/V sync wait — **when audio exists** |
| **Us** | Lab already no audio decode; PiP irrelevant for product PASS |
| **Skip** | Don’t invent WebRTC for this creep |

### Note on audio (BWC)

Agree in principle for **monitoring walls**. Product later may **want** talk/listen audio on some surfaces — then live-edge + audio is harder; don’t bake “forever no audio” as Axiom law without a product decision.

---

## Best-of-best product read (ours)

```
Best path delay     ≈ already ~2–3 s at live edge
Best operator feel  = stay there without drag
Best stack          = keep modern WVP+ZLM; harden Lab player;
                      optional Jessibuca only if mpegts ceiling hits
Best discipline     = one MOB; measure; abort; no gospel
```

Google frontend tip answers **creep**.  
Google stamp tip answers **possible ZLM clock**.  
Neither replaces **cam BYE ~24 min** until that soak proves.

---

## What we do with this paste (order — still no APPLY tonight mid-soak)

1. **Finish hour soak** (BYE lane).  
2. Keep stamp MOB as **optional** parallel lane after measure.  
3. **Primary product answer to “drag babysitting”:**  
   **`mob-wvp-lab-live-edge-nudge`**  
   - Interval or keepalive hook (we already kick every 15 s)  
   - If `buffered.end(0) - currentTime > ~3` → seek to `end - smallPad`  
   - Log once per jump (ops proof)  
   - **Do not** set `liveBufferLatencyChasing: true` in the same MOB unless you explicitly order that flag  
4. Jessibuca = **later genre** if nudge + modern stamp still lose at scale.  
5. Audio already off on Lab — no victory lap MOB for that alone.

---

## Reject / park from this paste

| Item | Why |
|------|-----|
| “ZLM is fine, only frontend” | Too absolute for our stamp/BYE logs |
| Drop-in Jessibuca tonight | Wrong size |
| Blind Gate-B style chase flags | Known burn |
| WebRTC mute checklist as main fix | Wrong transport |

---

## One line

**Google’s live-edge jump idea matches our drag proof and is worth adapting on mpegts as a controlled nudge; Jessibuca is a later product option; audio tip we largely already have; don’t take “backend is fine” or Gate-B chasing as gospel.**
