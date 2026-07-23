# MOB DISC — Big streams: is Fleet ready? Was it only FFmpeg? (NO APPLY)

**Status:** DISC only — 2026-07-19 · **no code**  
**Subject:** `MOB-DISC-BIG-STREAMS-FLEET-READY-VS-FFMPEG`  
**Operator question:** If big streams come in — will Fleet be ready? Is it already built ready? Or was it just that FFmpeg could not support big streaming?

**Related (locked earlier):**  
`MOB-DISC-WVP-SCALE-VS-FFMPEG.md` · `MOB-DISC-WVP-ZLM-SCALE-NOT-FUN-NOT-AGENT-PARK.md` · `MOB-DISC-PLAN-FLEET-FUNCTIONS-WVP-ZLM-VIDEO-GATE-20260719.md`

---

## Short answer

| Question | Answer |
|----------|--------|
| Is **Fleet the product** (Call / PTT / SOS / GPS / desk) ready for a big site? | **Mostly yes** — that pack was built for ops marriage, not for “80 browsers watching video.” |
| Is **Fleet’s classic live video path** ready for big streams? | **No** — and it was **never** designed as the big-qty media box. |
| Was the limit “just FFmpeg”? | **Mostly yes for video scale** — FFmpeg-as-we-use-it is a **per-cam converter**, not a many-viewer gateway. Not the only pain (invite pile-up, CPU, one pipe per watch), but **FFmpeg is the core reason classic live cannot be the big-stream story.** |
| What makes Fleet “ready” for big streams? | **Fleet desk + WVP/ZLM video gate** — Fleet stays product; WVP/ZLM carries big live qty. |

---

## Split two “ready” meanings (do not mix)

### A — Fleet product ready (functions)

Already built direction:

- Login / roles / fleet list  
- PTT channel, Call, SOS UX  
- GPS, map, evidence hooks  
- Wall UI, pin, Open All *as an operator desk*

**Big streams do not mean this layer is broken.**  
Many cams online + many SOS/PTT events is a **different** load than many **decoded live videos**. Fleet was built to own **A**.

### B — Live video at big qty (media)

Classic path today (lab / small qty):

```
Cam → Fleet SIP INVITE → FFmpeg convert (often per cam) → JSMpeg / WS → wall
```

That path is **good for a few lives on one desk**.  
It is **not** “already built ready” for:

- many cams live at once **and**  
- many operators / browsers watching the same cams  

That is why **WVP + ZLM sits on top as the video gate.**

---

## Why FFmpeg is the bottleneck (plain)

| What FFmpeg is here | What it is not |
|---------------------|----------------|
| A **converter** (cam bytes → format our old wall liked) | A **media server** that fans one ingest to many cheap viewers |
| Roughly **work per live cam** (CPU / process) | One shared stream many desks can read for free |

**Small qty:** 2–8 lives, one operator → FFmpeg can limp / pass.  
**Big qty:** many lives × many watchers → either many FFmpegs or heavy re-work per viewer → **CPU and pipes die**.

Industry pattern (what we are aiming at):

1. **One** ingest (or pass-through) per camera into a media box (**ZLM**)  
2. **Many** browsers read the **same** stream (cheap)  
3. **WVP** = who is online / startPlay / GB front desk for that media  

So: **yes — classic Fleet live could not support “big streaming” mainly because of the FFmpeg (converter) model**, not because Call/PTT/SOS were never built.

---

## What was already built vs what was missing

| Built (Fleet era) | Missing for big live |
|-------------------|----------------------|
| SIP marriage, SOS, PTT, Call UX | Media fan-out box (ZLM class) |
| Per-desk wall, Open All for lab | GB platform at qty (WVP class) for video home |
| FFmpeg path that **works small** | “One encode → many viewers” without N× FFmpeg |

**Fleet was ready as the desk.**  
**Fleet was not ready as the big-stream media engine** — and we should not pretend FFmpeg would grow into that.

---

## Will Fleet be ready when big streams come in?

**Under the locked plan — yes, if we stick to the split:**

```
Big video qty  →  WVP → ZLM  (video gate)
Product / voice / SOS / GPS  →  Fleet (Axiom desk)
```

| If we… | Ready? |
|--------|--------|
| Keep forcing big qty through FFmpeg wall | **No** |
| Put WVP/ZLM on top for live picture; Fleet keeps functions | **Yes — that is the design** |
| Finish bridges so Call/PTT/SOS accept “already live via ZLM” | Then **desk + big video** both work together |

So: Fleet **is** ready to *host* the product.  
Fleet **becomes** ready for big streams **by using WVP/ZLM for video**, not by making FFmpeg scale.

---

## Honest one-liner

> **Fleet was built ready for ops functions. Big live streams were never FFmpeg’s job — that is why WVP/ZLM is the video gate on top.**

---

## Out of scope this disc

- Exact cam/user numbers for a customer site (needs soak + hardware sizing)  
- Pack APPLY order for Call/PTT/SOS bridges (separate genre)  
- No restore · no “go back to Fleet-only live” as the scale answer
