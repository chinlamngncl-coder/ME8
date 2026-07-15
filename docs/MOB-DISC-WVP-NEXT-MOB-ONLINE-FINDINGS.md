# MOB DISC — What MOB to test later + online CN/GitHub findings

**Date:** 2026-07-15 ~00:44  
**Operator:** Little time; willing to take **bigger** risk if payoff is bigger. Which MOB later? Online dig (CN docs / GitHub / Jessibuca / ZLM).  
**Status:** DISCUSSION — **no APPLY** until soak done + you name it  
**Tone:** Shared knowledge — not gospel. Goal = best product.

---

## Recommendation (time-poor / accept risk)

### Test **this** first (one MOB — biggest bang for Lab creep)

**Name:** `mob-wvp-lab-mpegts-live-chase`

**Job (one sentence):** Stop the drag-bar babysitting — make mpegts **auto stay near live edge** (~2–3 s you already proved by hand).

**Why this, not stamp/Jessibuca first**

| Source | Says |
|--------|------|
| **Your glass** | Drag to end → ~2–3 s; without → creeps. That is **player buffer debt**. |
| **ZLM 作者 wiki**（《怎么测试延时》） | Ideal net: *seen* delay ≈ **player cache**; “锅得由播放器来背” |
| **mpegts.js 作者/issue #259** | Default **不追帧** → 延迟累计；开 **暴力追帧** 或 **平滑追帧** |
| **Jessibuca 文档** | `videoBuffer` + `videoBufferDelay` → **丢帧消延迟**；长时间不累积 |

So we were **under-using our own player**. Chase off = you became the chase.

**Bigger risk inside this one MOB (you said OK):** turn on **both** mpegts modes (community names them):

| Mode | Knobs | Feel |
|------|--------|------|
| **平滑追帧** | `liveSync: true` + max/target/rate | Speed-up catch-up — less jump |
| **暴力追帧** | `liveBufferLatencyChasing: true` + max/min remain | Jump `currentTime` — like your drag |

Suggested start (tune after first Prove — values from docs / #259, not fantasy):

```js
isLive: true,                    // already
hasAudio: false,                 // already
enableStashBuffer: false,        // already
liveSync: true,
liveSyncMaxLatency: 3,
liveSyncTargetLatency: 0.8,
liveSyncPlaybackRate: 1.2,
liveBufferLatencyChasing: true,
liveBufferLatencyMaxLatency: 3,  // jump if buffer debt > ~3s (your drag threshold)
liveBufferLatencyMinRemain: 0.5,
```

**Abort in 5 min if:** minutes of lag (Gate B scar), death reopen storm, or unusable hitch forever.

**PASS:** 30+ min, hand lag stays ~**2–5 s** **without** dragging the bar.

**Not in this MOB:** ZLM ini, Jessibuca vendor, wall, stamp.

**Risk honesty:** Gate B burned on chasing **+** wrong stash path. This time: Lab tiles only, audio already off, thresholds explicit, abort fast. Time trade: **one prove** vs days of half knobs.

---

## Optional mega-bet (only if chase FAIL or you want WVP-class player now)

**Name:** `mob-wvp-lab-jessibuca`

Wire Jessibuca on Lab tiles (ws-flv), e.g. `videoBuffer: 0.2`, `videoBufferDelay: 0.2–0.5`, `hasAudio: false` — CN product path next to WVP UI.

**Bigger** risk/time (new player, OEM, debug). Do **after** mpegts chase FAIL, or if you explicitly want product to match Chinese WVP stacks in one jump.

---

## What online said we had partially missed

| Finding | Link / place | We missed? |
|---------|----------------|------------|
| Player cache = main delay cup | [ZLM wiki 怎么测试延时](https://github.com/ZLMediaKit/ZLMediaKit/wiki/怎么测试ZLMediaKit的延时？) | Under-weighted vs stamp essays |
| mpegts **`liveSync`** (smooth) | [mpegts.js api](https://github.com/xqq/mpegts.js/blob/master/docs/api.md), [issue #259](https://github.com/xqq/mpegts.js/issues/259) | **Yes** — we only argued chasing true/false, not liveSync |
| Jessibuca drop-frame when buffer &gt; videoBuffer+Delay | [jessibuca.com/document](https://jessibuca.com/document), [api](https://jessibuca.com/api) | Known as “later”; still best CN practice |
| `modifyStamp=1` can **fix卡顿 then 丢帧** | [ZLM #1443](https://github.com/ZLMediaKit/ZLMediaKit/issues/1443) | Matches fossil FAIL risk — stamp second |
| `mergeWriteMS` huge delay | [ZLM #1881](https://github.com/ZLMediaKit/ZLMediaKit/issues/1881) | Ours already **0** — not the miss |
| GOP/player don’t drop = creep | ZLM wiki | Matches drag story |

Stamp Google essay = **possible** second knife. CN maintainer weight = **player first** for cumulative seconds.

---

## Parking lot (do later / smaller)

| MOB | When |
|-----|------|
| `mob-wvp-modern-modify-stamp-1` | After chase PASS, if stamp spam / residual still ugly |
| `mob-wvp-modern-lowlatency-1` | After stamp or alone if glitch OK |
| Cam BYE / auto-replay | After tonight’s hour soak log |
| Wall / Firmware Gold | **Never** from this latency lane without explicit wall MOB |

Skip separate “measure-only” MOB if you are time-poor — chase MOB **is** the measure (Pass/Fail in 30 min).

---

## Tonight vs later

| Now | Later (you say MOB-APPLY …) |
|-----|------------------------------|
| Finish hour soak | **`mob-wvp-lab-mpegts-live-chase`** |
| Say “soak done” | Agent logs BYE; then APPLY chase when you order |

---

## One line

**Later test the big one: `mob-wvp-lab-mpegts-live-chase` (liveSync + chasing on Lab mpegts) — CN/GitHub say the creep cup is the player; Jessibuca is the bigger alternative if that fails; stamp stays second knife.**
