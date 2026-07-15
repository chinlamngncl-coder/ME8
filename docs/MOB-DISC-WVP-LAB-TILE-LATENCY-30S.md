# MOB DISC — Track B lab tiles: latency ~30s (A worse)

**Date:** 2026-07-15 ~00:20 (+08)  
**Operator (soak in progress, started 00:16):** both cams lag; **Tile A ~30 s**; **Tile B** from a few seconds up to **~35 s**  
**Status:** DISCUSSION only — **do not tune mid-soak**; finish hour BYE prove first  
**Stack:** modern WVP + `me8-wvp-zlm` + Lab tiles (`wvp-lab-tile.js`)

---

## What you reported (fact)

| Tile | Typical delay feel |
|------|-------------------|
| **A** (kk / `…0009`) | ~**30 s** behind real |
| **B** (chin / `…0008`) | **seconds → ~35 s** (moves around) |

So: **not** “live enough.” Stability soak continues; latency is a **separate** PASS criterion.

---

## What is *not* the first lever

| Idea | Why park tonight |
|------|------------------|
| `mpegts` `liveBufferLatencyChasing` / stash-off | Gate B history: caused **minutes** of lag — **PARKED** (user rule) |
| Blind `modify_stamp` chase | Fossil stamp-tune **FAIL** (A lag spike) — modern still has `modify_stamp=2` + stamp warnings |
| Blame screensaver for this lag | Idle/blank can **grow** buffer; root stack delay can be large even awake |
| Touch Fleet wall / Open All | Track A locked path — out of scope for this Lab latency |

---

## Current Lab path (where delay can sit)

Rough chain for tiles:

**BWC → RTP into modern ZLM → (ws-flv / HTTP FLV) → mpegts.js → video**

Today modern ZLM desk defaults (file):

| Knob | Now | Latency note |
|------|-----|--------------|
| `modify_stamp` | **2** | Can fight BWC clocks; stamp spam exists |
| `lowLatency` (rtp/rtsp) | **0** | Off — Google-ish lever later, **one MOB**, risk glitch |
| `gop_cache` | **1** | Helps start; can add up to ~1 GOP |
| `mergeWriteMS` | **0** | Already low |
| mpegts `liveBufferLatencyChasing` | **false** | Keep false |
| mpegts `stashInitialSize` | **128** | Small; not 30 s alone |

Cloud **MP4 record** was on during last soak (record finish hooks). Recording + GOP cache can add delay; confirm next tune whether record is required for lab tiles.

**A worse than B** → often **that cam’s own encoder / radio / GOP / bitrate**, not only ZLM (same ZLM serves both). Measure both against a phone clock before blaming ZLM only.

---

## How to measure (same soak or next)

Without changing code:

1. Wave hand / show phone seconds in front of each cam.  
2. Note phone time vs tile picture.  
3. Write three samples: **T+5 min**, **T+30 min**, **T+55 min** (does delay **grow**?).  

| Pattern | Points to |
|---------|-----------|
| Delay **fixed** ~30 s from first picture | Path/GOP/buffer/config class |
| Delay **grows** over the hour | Stamp / player stash creep / tab throttle |
| A always worse than B by ~same gap | **Cam A** path more than ZLM global |

Tile panel log line shows play via: `ws-flv` / `direct-zlm` / `proxy` — note which A vs B use (proxy adds Fleet hop).

---

## Solve order (after hour BYE soak — one MOB at a time)

1. **Finish** current 1 h soak (BYE yes/no) — do **not** restart ZLM mid-run.  
2. **`mob-wvp-latency-measure`** (paper/ops) — clock samples + via= line; no knobs.  
3. If via=proxy for the slow tile → prefer prove **ws-flv / direct** only (`mob-wvp-tile-prefer-direct` already in family — confirm A uses it).  
4. Then **one** modern ZLM knob only, e.g. candidate `mob-wvp-modern-lowlatency-on` (`lowLatency=1`) **or** careful stamp change — **not both**; soak 30 min; PASS = lag down **and** no A/B death spiral.  
5. Cam side (A): lower GOP / bitrate if UI allows — only if measure says A-fixed gap.

Do **not** re-open fossil stamp-tune story as “the” fix.

---

## PASS / FAIL (latency genre)

| | |
|--|--|
| **PASS (lab)** | Both tiles routinely **&lt; ~3–5 s** behind wall clock for 30+ min (target to debate) |
| **FAIL** | Still ~30 s, or chasing drops lag but tiles reopen every few minutes |

Exact target seconds can be set when you say what “good enough” is for tender vs wall.

---

## One line

**~30 s on A (B up to ~35 s) is a real Track B latency problem separate from the mid BYE; finish this hour soak, then measure growth + play via before any single modern ZLM knob — no buffer-chasing, no mid-soak restart.**
