# MOB DISC — Modern WVP+ZLM two-tile soak (~49 min wall clock)

**Date:** 2026-07-15 ~00:00 (+08)  
**Operator:** both tiles ran ~49 min — ask: did log show break-off?  
**Source:** `docker logs me8-wvp-zlm` (modern stack)  
**Status:** FACTS — not assumption  

---

## Short answer

**Yes, it broke once in the middle.** Wall clock ~50 min, but ZLM shows **two holds of ~24–25 min** with a short media drop + re-register on **both** kk and chin. Not a clean unbroken ~49 min session.

---

## Stream map

| ID | Cam | Notes |
|----|-----|--------|
| `…0009` | kk | usual Tile A |
| `…0008` | chin | usual Tile B |

---

## Timeline (fmp4 媒体注册 / 媒体注销)

| From | To | Who | Length |
|------|-----|-----|--------|
| **23:08:24** | **23:32:05** | kk `…0009` live | **~24 min** |
| **23:08:25** | **23:32:13** | chin `…0008` live | **~24 min** |
| 23:32:05–13 | — | **both 媒体注销** (streams gone) | gap ~40–50 s |
| **23:32:49** | **23:57:57** | kk back | **~25 min** |
| **23:33:05** | **23:58:00** | chin back | **~25 min** |
| 23:57–23:58 | — | **both 媒体注销** again | end of soak / stop |

Wall start→end ≈ **23:08 → 23:58 = ~50 min** — matches your “49 min.”

---

## What that means

1. **Both cams ran a long time** on modern ZLM — better than fossil B dying at ~4–6 min.  
2. **Not continuous:** at **~24 min** both media planes **unregistered**, then **re-registered** within ~1 min. If the UI stayed up, that was **reopen / new pull**, not one socket.  
3. End drop at **~23:58** looks like soak stop / no reader (session end).  
4. **Stamp spam still there:** ~238 `Stamp expired is abnormal` lines in the last ~2 h on modern ZLM — noise, not proof of tile death by itself.

---

## Verdict vs fossil soak

| | Fossil (earlier tonight) | Modern (this soak) |
|--|-------------------------|-------------------|
| kk | ~48 min hold then stop | ~24 + ~25 min with mid bounce |
| chin | drops at ~4 / ~6 / ~21 min | same mid bounce as kk (~24 min) then held |

Modern = **both longer and together**, but **mid-session bounce is real in ZLM**.

---

## Honest gaps

- Browser DevTools / mpegts client close reason — not in ZLM  
- Tile panel “stopped / reopen” text — operator eyes; agent used **media注销/注册** only  
- Exact cause of 23:32 bounce (none-reader vs RTP vs client) — needs a follow named log MOB if you care

---

## One line

**You ran ~49 min on the clock; log shows a real break ~halfway (~24 min), then both came back ~25 min more. Pass for “long soak usable”; Fail for “never broke.”**
